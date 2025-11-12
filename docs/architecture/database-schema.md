# PTO Planner Database Schema

## Entity Relationship Diagram

```
users
+----------------+
| id (PK)        |
| email          |
| full_name      |
| created_at     |
| updated_at     |
+----------------+
        |
        | 1:1
        v
pto_settings
+----------------------+
| id (PK)              |
| user_id (FK)         |
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
pto_accrual_rules    pto_days      custom_holidays
+------------------+ +---------------+ +------------------+
| id (PK)          | | id (PK)       | | id (PK)          |
| user_id (FK)     | | user_id (FK)  | | user_id (FK)     |
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
       
pto_transactions        weekend_config
+-------------------+   +------------------+
| id (PK)           |   | id (PK)          |
| user_id (FK)      |   | user_id (FK)     |
| transaction_date  |   | day_of_week      |
| amount            |   | is_weekend       |
| transaction_type  |   | created_at       |
| description       |   | updated_at       |
| reference_id      |   +------------------+
| created_at        |
+-------------------+
```

## Table Descriptions

### users
Extends Supabase Auth users to store additional user information.
- **id**: Primary key, UUID reference to auth.users
- **email**: User's email address
- **full_name**: User's full name
- **created_at**: Timestamp when record was created
- **updated_at**: Timestamp when record was last updated

### pto_settings
Stores PTO configuration settings for each user.
- **id**: Primary key, UUID
- **user_id**: Foreign key to users table
- **pto_start_date**: Date from which PTO tracking begins
- **initial_balance**: Initial PTO balance when account is created
- **carry_over_limit**: Maximum amount of PTO that can be carried over to the next year
- **max_balance**: Maximum PTO balance allowed
- **renewal_date**: Date when PTO renews or expires
- **allow_negative_balance**: Whether negative PTO balance is allowed
- **pto_display_unit**: Unit for displaying PTO ('days' or 'hours')
- **hours_per_day**: Number of work hours in a standard day
- **hours_per_week**: Number of hours the user works across a typical week

### pto_accrual_rules
Defines how PTO accrues over time for a user.
- **id**: Primary key, UUID
- **user_id**: Foreign key to users table
- **name**: Name of the accrual rule
- **accrual_amount**: Amount of PTO accrued each period
- **accrual_frequency**: How often PTO accrues ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')
- **accrual_day**: Day of period when accrual occurs (if applicable)
- **effective_date**: Date when the rule becomes effective
- **end_date**: Optional date when the rule stops being effective
- **is_active**: Whether the rule is currently active

### pto_transactions
Records all changes to a user's PTO balance.
- **id**: Primary key, UUID
- **user_id**: Foreign key to users table
- **transaction_date**: Date when the transaction occurred
- **amount**: Amount of PTO (positive for accrual, negative for usage)
- **transaction_type**: Type of transaction ('accrual', 'usage', 'adjustment', 'expiration', 'carry-over')
- **description**: Optional description of the transaction
- **reference_id**: Optional reference to related entity (e.g., PTO day UUID)

### pto_days
Stores individual PTO days requested by users.
- **id**: Primary key, UUID
- **user_id**: Foreign key to users table
- **date**: Date of PTO
- **amount**: Amount of PTO used on this day
- **status**: Status of the PTO day ('planned', 'approved', 'taken', 'cancelled')
- **description**: Optional reason or note for the PTO day

### custom_holidays
Stores user-defined holidays.
- **id**: Primary key, UUID
- **user_id**: Foreign key to users table
- **name**: Name of the holiday
- **date**: Date of the holiday
- **repeats_yearly**: Whether the holiday repeats every year
- **is_paid_holiday**: Whether it's a paid holiday (doesn't count against PTO)

### weekend_config
Defines which days of the week are considered weekends for a user.
- **id**: Primary key, UUID
- **user_id**: Foreign key to users table
- **day_of_week**: Day of week (0=Sunday to 6=Saturday)
- **is_weekend**: Whether the day is treated as a weekend

## Key Features

1. **User-centric design**: All tables are linked to the user table, enabling multi-tenancy.
2. **Flexible PTO accrual**: Supports various accrual frequencies and rules.
3. **Detailed transaction history**: All PTO balance changes are recorded with timestamps and descriptions.
4. **Custom weekend configuration**: Users can define which days count as weekends.
5. **Custom holidays**: Support for both repeating and one-time holidays.
6. **Row Level Security**: All tables implement RLS to ensure users can only access their own data.
7. **Efficient indexing**: Indexes on frequently queried columns for better performance.

## Database Triggers

1. **update_updated_at_column()**: Updates the `updated_at` timestamp when records are modified.
2. **insert_default_weekend_config()**: Creates default weekend configuration (Saturday and Sunday) when a new user is added.

## Security Model

The database employs Supabase Row Level Security (RLS) policies to ensure that users can only access their own data. All tables have RLS enabled with policies that filter data based on the authenticated user ID. 