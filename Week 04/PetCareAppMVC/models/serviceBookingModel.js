const pool = require('../config/db');

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  pool.getConnection((connectionError, connection) => {
    if (connectionError) return callback(connectionError);

    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        connection.release();
        return callback(transactionError);
      }

      const ownershipAndServiceSql = `
        SELECT s.price
        FROM pets p
        JOIN services s ON s.id = ?
        WHERE p.id = ? AND p.owner_id = ? AND s.is_active = 1
      `;

      connection.query(ownershipAndServiceSql, [serviceId, petId, ownerId], (lookupError, rows) => {
        if (lookupError) {
          return rollbackAndFinish(connection, lookupError, callback);
        }

        if (!rows || rows.length !== 1) {
          return connection.rollback((rollbackError) => {
            connection.release();
            if (rollbackError) return callback(rollbackError);
            callback(null, null);
          });
        }

        const bookedPrice = rows[0].price;
        const bookingSql = `
          INSERT INTO service_bookings
            (pet_id, service_id, booking_date, booked_price, booking_status)
          VALUES (?, ?, ?, ?, 'pending')
        `;

        connection.query(
          bookingSql,
          [petId, serviceId, bookingDate, bookedPrice],
          (bookingError, bookingResult) => {
            if (bookingError) {
              return rollbackAndFinish(connection, bookingError, callback);
            }

            if (!bookingResult || bookingResult.affectedRows !== 1) {
              const affectedError = new Error('Booking insert did not create exactly one row.');
              return rollbackAndFinish(connection, affectedError, callback);
            }

            const paymentSql = `
              INSERT INTO payments
                (booking_id, amount, payment_status, payment_reference)
              VALUES (?, ?, 'pending', NULL)
            `;
            const bookingId = bookingResult.insertId;

            connection.query(paymentSql, [bookingId, bookedPrice], (paymentError, paymentResult) => {
              if (paymentError) {
                return rollbackAndFinish(connection, paymentError, callback);
              }

              if (!paymentResult || paymentResult.affectedRows !== 1) {
                const affectedError = new Error('Payment insert did not create exactly one row.');
                return rollbackAndFinish(connection, affectedError, callback);
              }

              connection.commit((commitError) => {
                if (commitError) {
                  return rollbackAndFinish(connection, commitError, callback);
                }

                connection.release();
                callback(null, {
                  bookingId,
                  paymentId: paymentResult.insertId
                });
              });
            });
          }
        );
      });
    });
  });
}

function rollbackAndFinish(connection, originalError, callback) {
  connection.rollback((rollbackError) => {
    connection.release();
    callback(rollbackError || originalError);
  });
}

function getBookingsByOwner(ownerId, callback) {
  const sql = `
    SELECT
      sb.id AS booking_id,
      DATE_FORMAT(sb.booking_date, '%Y-%m-%d') AS booking_date,
      p.name AS pet_name,
      s.name AS service_name,
      sb.booked_price,
      sb.booking_status,
      pay.payment_status,
      pay.payment_reference,
      sb.created_at
    FROM service_bookings sb
    JOIN pets p ON p.id = sb.pet_id
    JOIN services s ON s.id = sb.service_id
    LEFT JOIN payments pay ON pay.id = (
      SELECT p2.id
      FROM payments p2
      WHERE p2.booking_id = sb.id
      ORDER BY p2.id DESC
      LIMIT 1
    )
    WHERE p.owner_id = ?
    ORDER BY sb.created_at DESC, sb.id DESC
  `;
  pool.query(sql, [ownerId], callback);
}

module.exports = {
  createPendingBooking,
  getBookingsByOwner
};
