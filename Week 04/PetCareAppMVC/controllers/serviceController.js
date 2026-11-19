const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const serviceBookingModel = require('../models/serviceBookingModel');

function listServices(req, res) {
  const ownerId = req.session.user.id;
  const requestedPetId = req.query.petId;

  petModel.getPetsByOwner(ownerId, (petError, pets) => {
    if (petError) {
      console.error(petError);
      return res.status(500).send('Unable to load pets.');
    }

    serviceModel.getActiveServices((serviceError, services) => {
      if (serviceError) {
        console.error(serviceError);
        return res.status(500).send('Unable to load services.');
      }

      const ownedRequestedPet = requestedPetId
        ? pets.find(pet => String(pet.id) === String(requestedPetId))
        : null;

      res.render('services', {
        pets,
        services,
        selectedPetId: ownedRequestedPet ? String(ownedRequestedPet.id) : '',
        today: getLocalDateString(),
        messages: req.flash('success'),
        errors: req.flash('error'),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const ownerId = req.session.user.id;
  const petId = parsePositiveInteger(req.body.petId);
  const serviceId = parsePositiveInteger(req.body.serviceId);
  const bookingDate = req.body.bookingDate;

  if (!petId || !serviceId || !isValidBookingDate(bookingDate)) {
    req.flash('error', 'Choose a pet, service, and valid booking date.');
    return res.redirect('/services');
  }

  serviceBookingModel.createPendingBooking(
    ownerId,
    petId,
    serviceId,
    bookingDate,
    (error, result) => {
      if (error) {
        console.error(error);
        req.flash('error', 'Unable to create the booking. Please try again.');
        return res.redirect(`/services?petId=${petId}`);
      }

      if (!result) {
        req.flash('error', 'That pet or service is unavailable for booking.');
        return res.redirect('/services');
      }

      req.flash(
        'success',
        'Booking created. Payment is pending; no payment has been processed.'
      );
      return res.redirect('/bookings');
    }
  );
}

function listBookings(req, res) {
  const ownerId = req.session.user.id;

  serviceBookingModel.getBookingsByOwner(ownerId, (error, bookings) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Unable to load booking history.');
    }

    res.render('bookings', {
      bookings,
      messages: req.flash('success'),
      errors: req.flash('error'),
      session: req.session
    });
  });
}

function parsePositiveInteger(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidBookingDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  return value >= getLocalDateString();
}

module.exports = {
  listServices,
  createBooking,
  listBookings
};
