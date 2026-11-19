# Feature: Prepare payment details

## 1. User goal
Pet owners want to see the price of a pet service before paying, so they
know exactly what they will be charged.

## 2. Scope
The feature will:
- Look up a service by its ID from a mock catalogue.
- Return the service name, the price and a "ready for payment" status as JSON.
- Use the price from the server's catalogue.

The feature will NOT:
- Charge money or call a payment gateway.
- Use a database or create new tables.
- Render EJS pages.
- Require login (this is a classroom mock endpoint).

Preparing payment details is not the same as processing a payment.

## 3. Request
- Method and URL: GET /payments/prepare/:serviceId
- Input: serviceId, taken from the URL path.
- The client cannot supply a payment amount. Any amount sent in the
  request (for example ?amount=1) is ignored.

## 4. Service catalogue
| ID (number) | Service name (string) | Price (number) |
|-------------|-----------------------|----------------|
| 1           | Vaccination           | 35             |
| 2           | Pet Grooming          | 50             |
| 3           | Boarding              | 80             |

## 5. Successful response
HTTP status 200, with JSON containing exactly five fields:

{
  "serviceId": 1,
  "serviceName": "Vaccination",
  "amount": 35,
  "currency": "sgd",
  "status": "READY_FOR_PAYMENT"
}

- serviceId and amount are numbers. 35 is a JSON number, not "35.00".
- serviceName, currency and status are strings.
- currency is always "sgd" and status is always "READY_FOR_PAYMENT".

## 6. Unsuccessful response
If the service ID does not exist in the catalogue:
- HTTP status 404
- Body: exactly {"error":"Service not found"}, returned as JSON with
  one string field, "error".
- Service IDs such as 0 and -1 are not in the catalogue, so they also
  return this 404 response.

## 7. Acceptance criteria
- AC1: When service ID 1 is requested, expect 200, Vaccination, amount 35,
  and a response that meets AC5.
- AC2: When service ID 2 is requested, expect 200, Pet Grooming, amount 50,
  and a response that meets AC5.
- AC3: When service ID 3 is requested, expect 200, Boarding, amount 80,
  and a response that meets AC5.
- AC4: When service ID 999 is requested, expect 404 and
  {"error":"Service not found"}.
- AC5: Any successful response has exactly 5 fields, with the correct
  types and fixed values for currency and status.
- AC6: When service ID 1 is requested with ?amount=1, expect 200 and
  amount 35, because the client-supplied amount is ignored.

## 8. Open questions
- Should "01" or other non-canonical IDs identify a service?
- What should happen for "abc" and for a missing ID
  (/payments/prepare)? Status and body not agreed yet.
- Are the prepared details stored anywhere? For now they are only
  returned in the JSON response.
- Should a pet owner only be able to prepare details for their own pets,
  once pets are linked to services? (Out of scope this week.)
- Is login required in a later version of this feature?


## 9. Current behaviour (recorded after implementation)
Observed by testing in the browser. These are not yet agreed requirements.
- /payments/prepare/01 returns 200 with service 1 (Vaccination),
  because the ID is converted with Number().
- /payments/prepare/abc returns 404 {"error":"Service not found"}.
- /payments/prepare/0 and /payments/prepare/-1 return 404
  {"error":"Service not found"}.
- /payments/prepare (no ID) returns Express's default plain
  "Cannot GET" page, not JSON.