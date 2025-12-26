# PTO Planner Database Schema

## Collections Overview (Firestore)

```
users
+----------------+
| id (Document)  |
| email          |
| full_name      |
| created_at     |
| updated_at     |
+----------------+
        |
        | 1:1
        v
 ptoSettings
+----------------------+
| id (Document)        |
| user_id              |
| pto_start_date       |
| initial_balance      |
| carry_over_limit     |
| max_balance          |
| renewal_date         |
| allow_negative_balance|
| pto_display_unit     |
| hours_per_day        |
| hours_per_week       |
| created_at           |
| updated_at           |
+----------------------+
        |
        | 1:M
        |
  +-----+------+----------+
  |            |          |
  v            v          v
ptoAccrualRules    ptoDays      customHolidays
+------------------+ +---------------+ +------------------+
| id (Document)    | | id (Document) | | id (Document)    |
| user_id          | | user_id       | | user_id          |
| name             | | date          | | name             |
| accrual_amount   | | amount        | | date             |
| accrual_frequency| | status        | | repeats_yearly   |
| accrual_day      | | description   | | is_paid_holiday  |
| effective_date   | | created_at    | | created_at       |
| end_date         | | updated_at    | | updated_at       |
| is_active        | +---------------+ +------------------+
| created_at       |
| updated_at       |
+------------------+

ptoTransactions        weekendConfig
+-------------------+   +------------------+
| id (Document)     |   | id (Document)    |
| user_id           |   | user_id          |
| transaction_date  |   | day_of_week      |
| amount            |   | is_weekend       |
| transaction_type  |   | created_at       |
| description       |   | updated_at       |
| reference_id      |   +------------------+
| created_at        |
+-------------------+
```

## Collection Descriptions

### users
Stores user profile information, linked to Firebase Auth.
- **id**: Document ID, matches Firebase Auth UID
- **email**: User's email address
- **full_name**: User's full name
- **created_at**: Timestamp when record was created
- **updated_at**: Timestamp when record was last updated

### ptoSettings
Stores PTO configuration settings for each user.
- **id**: Document ID
- **user_id**: Reference to user's Firebase Auth UID
- **pto_start_date**: Date from which PTO tracking begins
- **initial_balance**: Initial PTO balance when account is created
- **carry_over_limit**: Maximum amount of PTO that can be carried over to the next year
- **max_balance**: Maximum PTO balance allowed
- **renewal_date**: Date when PTO renews or expires
- **allow_negative_balance**: Whether negative PTO balance is allowed
- **pto_display_unit**: Unit for displaying PTO ('days' or 'hours')
- **hours_per_day**: Number of work hours in a standard day
- **hours_per_week**: Number of hours the user works across a typical week

### ptoAccrualRules
Defines how PTO accrues over time for a user.
- **id**: Document ID
- **user_id**: Reference to user's Firebase Auth UID
- **name**: Name of the accrual rule
- **accrual_amount**: Amount of PTO accrued each period
- **accrual_frequency**: How often PTO accrues ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')
- **accrual_day**: Day of period when accrual occurs (if applicable)
- **effective_date**: Date when the rule becomes effective
- **end_date**: Optional date when the rule stops being effective
- **is_active**: Whether the rule is currently active

### ptoTransactions
Records all changes to a user's PTO balance.
- **id**: Document ID
- **user_id**: Reference to user's Firebase Auth UID
- **transaction_date**: Date when the transaction occurred
- **amount**: Amount of PTO (positive for accrual, negative for usage)
- **transaction_type**: Type of transaction ('accrual', 'usage', 'adjustment', 'expiration', 'carry-over')
- **description**: Optional description of the transaction
- **reference_id**: Optional reference to related entity (e.g., PTO day document ID)

### ptoDays
Stores individual PTO days requested by users.
- **id**: Document ID
- **user_id**: Reference to user's Firebase Auth UID
- **date**: Date of PTO
- **amount**: Amount of PTO used on this day
- **status**: Status of the PTO day ('planned', 'approved', 'taken', 'cancelled')
- **description**: Optional reason or note for the PTO day

### customHolidays
Stores user-defined holidays.
- **id**: Document ID
- **user_id**: Reference to user's Firebase Auth UID
- **name**: Name of the holiday
- **date**: Date of the holiday
- **repeats_yearly**: Whether the holiday repeats every year
- **is_paid_holiday**: Whether it's a paid holiday (doesn't count against PTO)

### weekendConfig
Defines which days of the week are considered weekends for a user.
- **id**: Document ID
- **user_id**: Reference to user's Firebase Auth UID
- **day_of_week**: Day of week (0=Sunday to 6=Saturday)
- **is_weekend**: Whether the day is treated as a weekend

## Key Features

1. **User-centric design**: All collections are linked via user_id, enabling multi-tenancy.
2. **Flexible PTO accrual**: Supports various accrual frequencies and rules.
3. **Detailed transaction history**: All PTO balance changes are recorded with timestamps and descriptions.
4. **Custom weekend configuration**: Users can define which days count as weekends.
5. **Custom holidays**: Support for both repeating and one-time holidays.
6. **Security Rules**: All collections implement Firestore security rules to ensure users can only access their own data.
7. **Composite Indexes**: Indexes configured for frequently queried fields.

## Security Model

The database employs Firestore Security Rules to ensure that users can only access their own data. All collections have rules that filter data based on the authenticated user ID from Firebase Auth. See `firestore.rules` for the complete security rules configuration.
