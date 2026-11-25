-- =============================================================================
-- schema_mysql.sql
-- MySQL 8.0+ / MySQL Workbench Compatible Schema (All 43 Tables)
-- MSU-Naawan Automated Payroll Management System
-- Ready for:
--   1) MySQL Workbench -> File -> Import -> Reverse Engineer MySQL Create Script
--   2) Direct execution on MySQL Server + Database -> Reverse Engineer
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS `payroll_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `payroll_db`;

-- =============================================================================
-- 0. LOOKUP TABLES
-- =============================================================================

CREATE TABLE `slip_types` (
  `id`   BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50)  NOT NULL COMMENT 'ORAS, BURAS',
  `name` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slip_types_code` (`code`)
) ENGINE=InnoDB;

CREATE TABLE `statuses` (
  `id`       BIGINT NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(50)  NOT NULL,
  `code`     VARCHAR(50)  NOT NULL,
  `name`     VARCHAR(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_statuses_category_code` (`category`, `code`)
) ENGINE=InnoDB;

-- =============================================================================
-- 1. CORE EMPLOYEE, AUTH, ACCESS & NOTIFICATIONS
-- (employees is created before users so the 1:1 FK needs no ALTER TABLE)
-- =============================================================================

CREATE TABLE `employees` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `employee_no`     VARCHAR(50)  NOT NULL,
  `last_name`       VARCHAR(100) NOT NULL,
  `first_name`      VARCHAR(100) NOT NULL,
  `middle_name`     VARCHAR(100) NULL,
  `birth_date`      DATE         NOT NULL,
  `employment_type` ENUM('REGULAR', 'CONTRACTUAL', 'JO', 'LECTURER') NOT NULL DEFAULT 'REGULAR',
  `bank_account_no` VARCHAR(50)  NULL,
  `tin`             VARCHAR(50)  NULL,
  `gsis_no`         VARCHAR(50)  NULL,
  `philhealth_no`   VARCHAR(50)  NULL,
  `pagibig_no`      VARCHAR(50)  NULL,
  `status_id`       BIGINT       NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employees_employee_no` (`employee_no`),
  KEY `idx_employees_status_id` (`status_id`),
  KEY `idx_employees_employment_type` (`employment_type`),
  CONSTRAINT `fk_employees_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `roles` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL COMMENT 'Admin, Employee, Immediate Supervisor, HR, Accounting, Cost Center Signatory, Budget, Chancellor, Cashier',
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE `users` (
  `id`            BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id`   BIGINT       NULL COMMENT 'nullable, 1:1 with employees',
  `role_id`       BIGINT       NOT NULL,
  `username`      VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `last_login_at` DATETIME     NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_employee_id` (`employee_id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_id` (`role_id`),
  CONSTRAINT `fk_users_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `audit_logs` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT       NOT NULL,
  `action`      VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id`   BIGINT       NOT NULL,
  `old_values`  JSON         NULL,
  `new_values`  JSON         NULL,
  `ip_address`  VARCHAR(45)  NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'append-only',
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `notifications` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT       NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `message`     TEXT         NOT NULL,
  `entity_type` VARCHAR(50)  NULL,
  `entity_id`   BIGINT       NULL,
  `is_read`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_unread` (`user_id`, `is_read`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 2. ORGANIZATIONAL UNITS, SIGNATORIES, APPOINTMENTS & PAY COMPONENTS
-- =============================================================================

CREATE TABLE `offices` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `code`         VARCHAR(50)  NOT NULL,
  `name`         VARCHAR(200) NOT NULL,
  `head_user_id` BIGINT       NULL COMMENT 'immediate supervisor',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_offices_code` (`code`),
  KEY `idx_offices_head_user_id` (`head_user_id`),
  CONSTRAINT `fk_offices_head_user`
    FOREIGN KEY (`head_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `cost_centers` (
  `id`   BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50)  NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cost_centers_code` (`code`)
) ENGINE=InnoDB;

CREATE TABLE `cost_center_signatories` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `cost_center_id`  BIGINT       NOT NULL,
  `user_id`         BIGINT       NOT NULL,
  `document_type`   ENUM('PAYROLL', 'ORAS', 'BURAS', 'DV', 'ADA', 'ADCA') NOT NULL,
  `signatory_order` INT          NOT NULL DEFAULT 1,
  `designation`     VARCHAR(150) NULL,
  `is_active`       TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cc_signatory` (`cost_center_id`, `user_id`, `document_type`, `signatory_order`),
  KEY `idx_cc_signatories_cc_doc` (`cost_center_id`, `document_type`),
  KEY `idx_cc_signatories_user_id` (`user_id`),
  CONSTRAINT `fk_cc_signatories_cost_center`
    FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cc_signatories_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `funds` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `code`         VARCHAR(50)  NOT NULL COMMENT '01, 05, 07',
  `name`         VARCHAR(200) NOT NULL,
  `slip_type_id` BIGINT       NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_funds_code` (`code`),
  KEY `idx_funds_slip_type_id` (`slip_type_id`),
  CONSTRAINT `fk_funds_slip_type`
    FOREIGN KEY (`slip_type_id`) REFERENCES `slip_types` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `payroll_periods` (
  `id`                  BIGINT NOT NULL AUTO_INCREMENT,
  `label`               VARCHAR(100) NOT NULL,
  `period_start`        DATE         NOT NULL,
  `period_end`          DATE         NOT NULL,
  `submission_deadline` DATE         NOT NULL,
  `status_id`           BIGINT       NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_periods_status_id` (`status_id`),
  CONSTRAINT `fk_payroll_periods_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `appointments` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id`     BIGINT         NOT NULL,
  `office_id`       BIGINT         NOT NULL,
  `cost_center_id`  BIGINT         NOT NULL,
  `fund_id`         BIGINT         NOT NULL,
  `employment_type` ENUM('REGULAR', 'CONTRACTUAL', 'JO', 'LECTURER') NOT NULL DEFAULT 'REGULAR',
  `position_title`  VARCHAR(150)   NOT NULL,
  `salary_grade`    VARCHAR(20)    NULL,
  `step_increment`  INT            NULL,
  `monthly_rate`    DECIMAL(14, 2) NULL,
  `daily_rate`      DECIMAL(14, 2) NULL,
  `hourly_rate`     DECIMAL(14, 2) NULL,
  `effective_from`  DATE           NOT NULL,
  `effective_to`    DATE           NULL,
  PRIMARY KEY (`id`),
  KEY `idx_appointments_employee_id` (`employee_id`),
  KEY `idx_appointments_office_id` (`office_id`),
  KEY `idx_appointments_cost_center_id` (`cost_center_id`),
  KEY `idx_appointments_fund_id` (`fund_id`),
  KEY `idx_appointments_employment_type` (`employment_type`),
  CONSTRAINT `fk_appointments_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_office`
    FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_cost_center`
    FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_fund`
    FOREIGN KEY (`fund_id`) REFERENCES `funds` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `pay_components` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `code`         VARCHAR(50)  NOT NULL,
  `name`         VARCHAR(150) NOT NULL,
  `type`         ENUM('EARNING', 'ALLOWANCE', 'DEDUCTION', 'ADJUSTMENT') NOT NULL,
  `is_statutory` TINYINT(1)   NOT NULL DEFAULT 0,
  `calc_method`  ENUM('FIXED', 'PERCENT', 'TABLE') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pay_components_code` (`code`)
) ENGINE=InnoDB;

CREATE TABLE `employee_components` (
  `id`             BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id`    BIGINT         NOT NULL,
  `component_id`   BIGINT         NOT NULL,
  `period_id`      BIGINT         NULL COMMENT 'nullable: set for one-time payments / adjustments',
  `is_one_time`    TINYINT(1)     NOT NULL DEFAULT 0,
  `amount`         DECIMAL(14, 2) NOT NULL,
  `effective_from` DATE           NOT NULL,
  `effective_to`   DATE           NULL,
  PRIMARY KEY (`id`),
  KEY `idx_employee_components_emp_id` (`employee_id`),
  KEY `idx_employee_components_comp_id` (`component_id`),
  KEY `idx_employee_components_period_id` (`period_id`),
  CONSTRAINT `fk_employee_components_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_components_component`
    FOREIGN KEY (`component_id`) REFERENCES `pay_components` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_components_period`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 3. DOCUMENT TRACKING
-- =============================================================================

CREATE TABLE `document_types` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(150) NOT NULL,
  `is_required` TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `document_type_employment_types` (
  `document_type_id` BIGINT NOT NULL,
  `employment_type`  ENUM('REGULAR', 'CONTRACTUAL', 'JO', 'LECTURER') NOT NULL,
  PRIMARY KEY (`document_type_id`, `employment_type`),
  KEY `idx_dtet_employment_type` (`employment_type`),
  CONSTRAINT `fk_dtet_document_type`
    FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `document_submissions` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `period_id`    BIGINT     NOT NULL,
  `office_id`    BIGINT     NOT NULL,
  `employee_id`  BIGINT     NOT NULL,
  `submitted_by` BIGINT     NOT NULL,
  `submitted_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_late`      TINYINT(1) NOT NULL DEFAULT 0,
  `status_id`    BIGINT     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_doc_submissions_period_office` (`period_id`, `office_id`),
  KEY `idx_doc_submissions_office_id` (`office_id`),
  KEY `idx_doc_submissions_employee_id` (`employee_id`),
  KEY `idx_doc_submissions_submitted_by` (`submitted_by`),
  KEY `idx_doc_submissions_status_id` (`status_id`),
  CONSTRAINT `fk_doc_submissions_period`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_doc_submissions_office`
    FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_doc_submissions_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_doc_submissions_submitted_by`
    FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_doc_submissions_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `submission_items` (
  `id`               BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id`    BIGINT       NOT NULL,
  `document_type_id` BIGINT       NOT NULL,
  `file_path`        VARCHAR(500) NULL,
  `is_complete`      TINYINT(1)   NOT NULL DEFAULT 0,
  `remarks`          VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_submission_items_submission_id` (`submission_id`),
  KEY `idx_submission_items_doc_type_id` (`document_type_id`),
  CONSTRAINT `fk_submission_items_submission`
    FOREIGN KEY (`submission_id`) REFERENCES `document_submissions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_submission_items_doc_type`
    FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `logbook_verifications` (
  `id`                 BIGINT NOT NULL AUTO_INCREMENT,
  `submission_id`      BIGINT       NOT NULL,
  `verification_stage` ENUM('SUPERVISOR', 'HR') NOT NULL,
  `verified_by`        BIGINT       NOT NULL,
  `verified_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `result`             ENUM('PASSED', 'FAILED') NOT NULL,
  `remarks`            VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_logbook_submission_stage` (`submission_id`, `verification_stage`),
  KEY `idx_logbook_verifications_verified_by` (`verified_by`),
  CONSTRAINT `fk_logbook_verifications_submission`
    FOREIGN KEY (`submission_id`) REFERENCES `document_submissions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_logbook_verifications_verified_by`
    FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `transmittals` (
  `id`             BIGINT NOT NULL AUTO_INCREMENT,
  `transmittal_no` VARCHAR(100) NOT NULL,
  `from_office_id` BIGINT       NOT NULL,
  `to_office_id`   BIGINT       NOT NULL,
  `created_by`     BIGINT       NOT NULL,
  `sent_at`        DATETIME     NULL,
  `received_at`    DATETIME     NULL,
  `status_id`      BIGINT       NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transmittals_transmittal_no` (`transmittal_no`),
  KEY `idx_transmittals_from_office` (`from_office_id`),
  KEY `idx_transmittals_to_office` (`to_office_id`),
  KEY `idx_transmittals_created_by` (`created_by`),
  KEY `idx_transmittals_status_id` (`status_id`),
  CONSTRAINT `fk_transmittals_from_office`
    FOREIGN KEY (`from_office_id`) REFERENCES `offices` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transmittals_to_office`
    FOREIGN KEY (`to_office_id`) REFERENCES `offices` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transmittals_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transmittals_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `transmittal_items` (
  `transmittal_id` BIGINT NOT NULL,
  `submission_id`  BIGINT NOT NULL,
  PRIMARY KEY (`transmittal_id`, `submission_id`),
  KEY `idx_transmittal_items_submission_id` (`submission_id`),
  CONSTRAINT `fk_transmittal_items_transmittal`
    FOREIGN KEY (`transmittal_id`) REFERENCES `transmittals` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transmittal_items_submission`
    FOREIGN KEY (`submission_id`) REFERENCES `document_submissions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 4. ATTENDANCE, LEAVE & PAYROLL COMPUTATION
-- =============================================================================

CREATE TABLE `dtr_imports` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `period_id`   BIGINT       NOT NULL,
  `office_id`   BIGINT       NOT NULL,
  `imported_by` BIGINT       NOT NULL,
  `file_name`   VARCHAR(255) NOT NULL COMMENT 'MyWork export file',
  `row_count`   INT          NOT NULL DEFAULT 0,
  `error_count` INT          NOT NULL DEFAULT 0,
  `imported_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dtr_imports_period_office` (`period_id`, `office_id`),
  KEY `idx_dtr_imports_office_id` (`office_id`),
  KEY `idx_dtr_imports_imported_by` (`imported_by`),
  CONSTRAINT `fk_dtr_imports_period`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dtr_imports_office`
    FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dtr_imports_imported_by`
    FOREIGN KEY (`imported_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `dtr_records` (
  `id`                BIGINT NOT NULL AUTO_INCREMENT,
  `import_id`         BIGINT        NULL COMMENT 'nullable for manual entries',
  `employee_id`       BIGINT        NOT NULL,
  `work_date`         DATE          NOT NULL,
  `time_in`           TIME          NULL,
  `time_out`          TIME          NULL,
  `late_minutes`      INT           NOT NULL DEFAULT 0,
  `undertime_minutes` INT           NOT NULL DEFAULT 0,
  `is_absent`         TINYINT(1)    NOT NULL DEFAULT 0,
  `hours_worked`      DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `entry_source`      ENUM('IMPORT', 'MANUAL') NOT NULL DEFAULT 'IMPORT',
  `verified_by`       BIGINT        NULL COMMENT 'HR or Supervisor verification',
  `verified_at`       DATETIME      NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dtr_records_import_id` (`import_id`),
  KEY `idx_dtr_records_emp_date` (`employee_id`, `work_date`),
  KEY `idx_dtr_records_verified_by` (`verified_by`),
  CONSTRAINT `fk_dtr_records_import`
    FOREIGN KEY (`import_id`) REFERENCES `dtr_imports` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dtr_records_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dtr_records_verified_by`
    FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `leave_records` (
  `id`          BIGINT NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT        NOT NULL,
  `leave_type`  ENUM('VL', 'SL', 'CTO', 'SPL', 'MATERNITY', 'PATERNITY', 'LWOP', 'OTHER') NOT NULL,
  `start_date`  DATE          NOT NULL,
  `end_date`    DATE          NOT NULL,
  `days_count`  DECIMAL(5, 2) NOT NULL,
  `is_with_pay` TINYINT(1)    NOT NULL DEFAULT 1,
  `approved_by` BIGINT        NULL,
  `approved_at` DATETIME      NULL,
  `status_id`   BIGINT        NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_leave_records_emp_dates` (`employee_id`, `start_date`, `end_date`),
  KEY `idx_leave_records_approved_by` (`approved_by`),
  KEY `idx_leave_records_status_id` (`status_id`),
  CONSTRAINT `fk_leave_records_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_records_approved_by`
    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_records_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `payroll_batches` (
  `id`               BIGINT NOT NULL AUTO_INCREMENT,
  `period_id`        BIGINT         NOT NULL,
  `office_id`        BIGINT         NOT NULL,
  `cost_center_id`   BIGINT         NOT NULL,
  `fund_id`          BIGINT         NOT NULL,
  `employment_type`  ENUM('REGULAR', 'CONTRACTUAL', 'JO', 'LECTURER') NOT NULL DEFAULT 'REGULAR' COMMENT 'grouped by payroll type',
  `batch_no`         VARCHAR(100)   NOT NULL,
  `total_gross`      DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'snapshot',
  `total_deductions` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'snapshot',
  `total_net`        DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'snapshot',
  `status_id`        BIGINT         NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_batches_batch_no` (`batch_no`),
  KEY `idx_payroll_batches_period_id` (`period_id`),
  KEY `idx_payroll_batches_office_id` (`office_id`),
  KEY `idx_payroll_batches_cost_center_id` (`cost_center_id`),
  KEY `idx_payroll_batches_fund_id` (`fund_id`),
  KEY `idx_payroll_batches_emp_type` (`employment_type`),
  KEY `idx_payroll_batches_status_id` (`status_id`),
  CONSTRAINT `fk_payroll_batches_period`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_batches_office`
    FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_batches_cost_center`
    FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_batches_fund`
    FOREIGN KEY (`fund_id`) REFERENCES `funds` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_batches_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `payroll_items` (
  `id`                       BIGINT NOT NULL AUTO_INCREMENT,
  `batch_id`                 BIGINT         NOT NULL,
  `appointment_id`           BIGINT         NOT NULL COMMENT 'employee via appointment',
  `days_worked`              DECIMAL(6, 2)  NOT NULL DEFAULT 0.00,
  `absences`                 DECIMAL(6, 2)  NOT NULL DEFAULT 0.00,
  `late_undertime_deduction` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `proration_factor`         DECIMAL(6, 4)  NOT NULL DEFAULT 1.0000,
  `gross_pay`                DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'snapshot',
  `total_deductions`         DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'snapshot',
  `net_pay`                  DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'snapshot',
  PRIMARY KEY (`id`),
  KEY `idx_payroll_items_batch_id` (`batch_id`),
  KEY `idx_payroll_items_appointment_id` (`appointment_id`),
  CONSTRAINT `fk_payroll_items_batch`
    FOREIGN KEY (`batch_id`) REFERENCES `payroll_batches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_items_appointment`
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `payroll_item_lines` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `payroll_item_id` BIGINT         NOT NULL,
  `component_id`    BIGINT         NOT NULL,
  `amount`          DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_item_lines_item_id` (`payroll_item_id`),
  KEY `idx_payroll_item_lines_component_id` (`component_id`),
  CONSTRAINT `fk_payroll_item_lines_item`
    FOREIGN KEY (`payroll_item_id`) REFERENCES `payroll_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_item_lines_component`
    FOREIGN KEY (`component_id`) REFERENCES `pay_components` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 5. APPROVAL WORKFLOW
-- =============================================================================

CREATE TABLE `workflow_templates` (
  `id`            BIGINT NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(150) NOT NULL,
  `document_type` ENUM('PAYROLL', 'ORAS', 'BURAS', 'DV', 'ADA', 'ADCA') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `workflow_steps` (
  `id`                        BIGINT NOT NULL AUTO_INCREMENT,
  `template_id`               BIGINT       NOT NULL,
  `step_order`                INT          NOT NULL,
  `role_id`                   BIGINT       NOT NULL,
  `use_cost_center_signatory` TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 => resolve via cost_center_signatories',
  `step_name`                 VARCHAR(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_steps_template_order` (`template_id`, `step_order`),
  KEY `idx_workflow_steps_role_id` (`role_id`),
  CONSTRAINT `fk_workflow_steps_template`
    FOREIGN KEY (`template_id`) REFERENCES `workflow_templates` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_workflow_steps_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `approval_requests` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `template_id`  BIGINT      NOT NULL,
  `entity_type`  VARCHAR(50) NOT NULL COMMENT 'polymorphic',
  `entity_id`    BIGINT      NOT NULL,
  `current_step` INT         NOT NULL DEFAULT 1,
  `status_id`    BIGINT      NOT NULL,
  `requested_by` BIGINT      NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_approval_requests_template_id` (`template_id`),
  KEY `idx_approval_requests_entity` (`entity_type`, `entity_id`),
  KEY `idx_approval_requests_status_id` (`status_id`),
  KEY `idx_approval_requests_requested_by` (`requested_by`),
  CONSTRAINT `fk_approval_requests_template`
    FOREIGN KEY (`template_id`) REFERENCES `workflow_templates` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_requests_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_requests_requested_by`
    FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `approval_actions` (
  `id`         BIGINT NOT NULL AUTO_INCREMENT,
  `request_id` BIGINT       NOT NULL,
  `step_id`    BIGINT       NOT NULL,
  `acted_by`   BIGINT       NOT NULL,
  `action`     ENUM('APPROVE', 'RETURN', 'REJECT') NOT NULL,
  `remarks`    VARCHAR(500) NULL,
  `acted_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_approval_actions_request_id` (`request_id`),
  KEY `idx_approval_actions_step_id` (`step_id`),
  KEY `idx_approval_actions_acted_by` (`acted_by`),
  CONSTRAINT `fk_approval_actions_request`
    FOREIGN KEY (`request_id`) REFERENCES `approval_requests` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_actions_step`
    FOREIGN KEY (`step_id`) REFERENCES `workflow_steps` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_actions_acted_by`
    FOREIGN KEY (`acted_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `obligation_slips` (
  `id`        BIGINT NOT NULL AUTO_INCREMENT,
  `batch_id`  BIGINT         NOT NULL COMMENT 'fund and slip type via batch',
  `slip_no`   VARCHAR(100)   NOT NULL,
  `amount`    DECIMAL(14, 2) NOT NULL,
  `status_id` BIGINT         NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_obligation_slips_slip_no` (`slip_no`),
  KEY `idx_obligation_slips_batch_id` (`batch_id`),
  KEY `idx_obligation_slips_status_id` (`status_id`),
  CONSTRAINT `fk_obligation_slips_batch`
    FOREIGN KEY (`batch_id`) REFERENCES `payroll_batches` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_obligation_slips_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `disbursement_vouchers` (
  `id`                 BIGINT NOT NULL AUTO_INCREMENT,
  `obligation_slip_id` BIGINT         NOT NULL COMMENT 'batch via slip',
  `dv_no`              VARCHAR(100)   NOT NULL,
  `amount`             DECIMAL(14, 2) NOT NULL,
  `dv_date`            DATE           NOT NULL,
  `status_id`          BIGINT         NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_disbursement_vouchers_slip_id` (`obligation_slip_id`),
  UNIQUE KEY `uq_disbursement_vouchers_dv_no` (`dv_no`),
  KEY `idx_disbursement_vouchers_status_id` (`status_id`),
  CONSTRAINT `fk_disbursement_vouchers_slip`
    FOREIGN KEY (`obligation_slip_id`) REFERENCES `obligation_slips` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_disbursement_vouchers_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 6. OUTPUT, REPORTING, JOURNAL ENTRIES & HISTORICAL UPLOADS
-- =============================================================================

CREATE TABLE `payroll_registers` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `batch_id`     BIGINT       NOT NULL,
  `register_no`  VARCHAR(100) NOT NULL,
  `file_path`    VARCHAR(500) NOT NULL,
  `generated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` BIGINT       NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_registers_batch_id` (`batch_id`),
  UNIQUE KEY `uq_payroll_registers_register_no` (`register_no`),
  KEY `idx_payroll_registers_generated_by` (`generated_by`),
  CONSTRAINT `fk_payroll_registers_batch`
    FOREIGN KEY (`batch_id`) REFERENCES `payroll_batches` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_registers_generated_by`
    FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `ada_forms` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `batch_id`     BIGINT         NOT NULL,
  `form_type`    ENUM('ADA', 'ADCA') NOT NULL DEFAULT 'ADA',
  `ada_no`       VARCHAR(100)   NOT NULL,
  `total_amount` DECIMAL(14, 2) NOT NULL,
  `file_path`    VARCHAR(500)   NOT NULL,
  `status_id`    BIGINT         NOT NULL,
  `generated_at` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ada_forms_ada_no` (`ada_no`),
  KEY `idx_ada_forms_batch_id` (`batch_id`),
  KEY `idx_ada_forms_status_id` (`status_id`),
  CONSTRAINT `fk_ada_forms_batch`
    FOREIGN KEY (`batch_id`) REFERENCES `payroll_batches` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ada_forms_status`
    FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `bank_upload_files` (
  `id`           BIGINT NOT NULL AUTO_INCREMENT,
  `ada_id`       BIGINT         NOT NULL COMMENT 'batch via ADA/ADCA',
  `file_name`    VARCHAR(255)   NOT NULL COMMENT 'LandBank format',
  `record_count` INT            NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(14, 2) NOT NULL,
  `generated_at` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bank_upload_files_ada_id` (`ada_id`),
  CONSTRAINT `fk_bank_upload_files_ada`
    FOREIGN KEY (`ada_id`) REFERENCES `ada_forms` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `payslips` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `payroll_item_id` BIGINT   NOT NULL COMMENT 'employee via item',
  `published_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `viewed_at`       DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payslips_payroll_item_id` (`payroll_item_id`),
  CONSTRAINT `fk_payslips_payroll_item`
    FOREIGN KEY (`payroll_item_id`) REFERENCES `payroll_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `journal_entries` (
  `id`                      BIGINT NOT NULL AUTO_INCREMENT,
  `disbursement_voucher_id` BIGINT       NOT NULL,
  `jev_no`                  VARCHAR(100) NOT NULL,
  `entry_date`              DATE         NOT NULL,
  `particulars`             VARCHAR(500) NULL,
  `prepared_by`             BIGINT       NOT NULL,
  `created_at`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_journal_entries_dv_id` (`disbursement_voucher_id`),
  UNIQUE KEY `uq_journal_entries_jev_no` (`jev_no`),
  KEY `idx_journal_entries_prepared_by` (`prepared_by`),
  CONSTRAINT `fk_journal_entries_dv`
    FOREIGN KEY (`disbursement_voucher_id`) REFERENCES `disbursement_vouchers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_journal_entries_prepared_by`
    FOREIGN KEY (`prepared_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `journal_entry_lines` (
  `id`               BIGINT NOT NULL AUTO_INCREMENT,
  `journal_entry_id` BIGINT         NOT NULL,
  `account_code`     VARCHAR(50)    NOT NULL COMMENT 'UACS account code',
  `account_title`    VARCHAR(200)   NOT NULL,
  `debit`            DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `credit`           DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_je_lines_entry_id` (`journal_entry_id`),
  CONSTRAINT `fk_je_lines_journal_entry`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `historical_uploads` (
  `id`              BIGINT NOT NULL AUTO_INCREMENT,
  `period_id`       BIGINT       NULL,
  `office_id`       BIGINT       NULL,
  `employment_type` ENUM('REGULAR', 'CONTRACTUAL', 'JO', 'LECTURER') NULL,
  `uploaded_by`     BIGINT       NOT NULL,
  `file_name`       VARCHAR(255) NOT NULL,
  `file_path`       VARCHAR(500) NOT NULL,
  `description`     VARCHAR(500) NULL,
  `uploaded_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_historical_uploads_period_id` (`period_id`),
  KEY `idx_historical_uploads_office_id` (`office_id`),
  KEY `idx_historical_uploads_emp_type` (`employment_type`),
  KEY `idx_historical_uploads_uploaded_by` (`uploaded_by`),
  CONSTRAINT `fk_historical_uploads_period`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_historical_uploads_office`
    FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_historical_uploads_uploaded_by`
    FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
