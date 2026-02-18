# Database Schema

## Users & Authentication

### User
- id (UUID)
- email (unique)
- name
- password (bcrypt hashed)
- role (ADMIN, TAILOR, CUSTOMER)
- profileImage
- phone
- createdAt, updatedAt

### TailorProfile
- id (UUID)
- userId (FK to User)
- bio
- specializations
- yearsExperience
- averageRating
- totalOrders
- totalEarnings
- monthlyEarnings
- isActive

## Customer Data

### Address
- id (UUID)
- userId (FK to User)
- street, city, state, postalCode, country
- isDefault
- createdAt, updatedAt

### Measurement
- id (UUID)
- userId (FK to User)
- name
- chest, waist, hip, shoulder, sleeveLength, garmentLength
- notes
- createdAt, updatedAt

## Products & Orders

### Product
- id (UUID)
- name, description
- price
- image
- category
- size, color, material
- stock
- isActive
- createdAt, updatedAt

### Order (Ready-made items)
- id (UUID)
- customerId (FK to User)
- addressId (FK to Address)
- orderNumber (unique)
- status (PENDING, ASSIGNED, STITCHING, COMPLETED, DELIVERED, CANCELLED)
- totalAmount
- paymentStatus (PENDING, COMPLETED, FAILED, REFUNDED)
- notes
- deliveredAt
- createdAt, updatedAt

### OrderItem
- id (UUID)
- orderId (FK to Order)
- productId (FK to Product)
- quantity
- price (at time of order)
- createdAt

## Custom Stitching

### StitchingOrder
- id (UUID)
- customerId (FK to User)
- measurementId (FK to Measurement)
- clothType (enum)
- fabricImage
- completedImage
- stitchingService
- price
- status
- notes
- deliveredAt
- createdAt, updatedAt

### Assignment
- id (UUID)
- stitchingOrderId (FK to StitchingOrder, unique)
- tailorId (FK to User)
- assignedAt
- completedAt
- createdAt, updatedAt

## Reviews & Payments

### Review
- id (UUID)
- customerId (FK to User)
- tailorId (FK to User)
- tailorProfileId (FK to TailorProfile)
- stitchingOrderId (FK to StitchingOrder)
- rating (1-5)
- comment
- isApproved (for moderation)
- createdAt, updatedAt

### Payment
- id (UUID)
- orderId (FK to Order, nullable)
- stitchingOrderId (FK to StitchingOrder, nullable)
- customerId (FK to User)
- amount
- status (PENDING, COMPLETED, FAILED, REFUNDED)
- stripePaymentId
- notes
- createdAt, updatedAt
