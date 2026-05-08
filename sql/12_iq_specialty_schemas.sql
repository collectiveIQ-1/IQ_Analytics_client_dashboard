--
-- PostgreSQL database dump
--

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: iq_amneuro; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_amneuro;


--
-- Name: iq_completeneuro; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_completeneuro;


--
-- Name: iq_confidas; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_confidas;


--
-- Name: iq_innervate; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_innervate;


--
-- Name: iq_ionm; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_ionm;


--
-- Name: iq_neurosurge; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_neurosurge;


--
-- Name: iq_neurowatch; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_neurowatch;


--
-- Name: iq_ops_dashboard; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_ops_dashboard;


--
-- Name: iq_qfd; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_qfd;


--
-- Name: iq_soleil; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_soleil;


--
-- Name: iq_synapses; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_synapses;


--
-- Name: iq_tsh; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_tsh;


--
-- Name: iq_txph; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_txph;


--
-- Name: iq_usneuro; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iq_usneuro;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: billing_report_amneuro; Type: TABLE; Schema: iq_amneuro; Owner: -
--

CREATE TABLE iq_amneuro.billing_report_amneuro (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    patient_id integer,
    initial_filing_date date,
    claim_seq integer,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    billing_folder text,
    tech_name text,
    claim_biller text,
    billing_queue text,
    patientbalance double precision,
    insurancebalance double precision,
    deductible double precision,
    copay double precision,
    co_ins double precision
);


--
-- Name: payment_report; Type: TABLE; Schema: iq_amneuro; Owner: -
--

CREATE TABLE iq_amneuro.payment_report (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id integer,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid integer,
    zero_pay text,
    billing_entity text,
    ins_comments_denial_code text,
    hospital_state text
);


--
-- Name: ccr_history; Type: TABLE; Schema: iq_completeneuro; Owner: -
--

CREATE TABLE iq_completeneuro.ccr_history (
    client text,
    month text,
    ccr text,
    adjusted text
);


--
-- Name: completeneuro_full_billing; Type: TABLE; Schema: iq_completeneuro; Owner: -
--

CREATE TABLE iq_completeneuro.completeneuro_full_billing (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    activity text,
    modifier text,
    patient_id integer,
    claim_seq integer,
    usmon_status text,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    collector text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    cpt text,
    pos text,
    ins_policy_hash text,
    last_note_date text,
    procedure_type text,
    or_procedure text,
    date_collected date,
    plan_type text,
    denial_reason_1 text,
    denial_reason_2 text,
    diagnosis_code_1 text,
    diagnosis_code_2 text,
    diagnosis_code_3 text,
    diagnosis_code_4 text,
    note_type text,
    last_billing_note text,
    status_code text,
    employer text,
    coverage text,
    funding_type text,
    clm_status text,
    biller text,
    billing_folder text,
    tech_name text,
    claim_biller text,
    billing_queue text,
    patient_balance text,
    insurance_balance double precision,
    deductible double precision,
    copay double precision,
    co_ins double precision
);


--
-- Name: completeneuro_full_deposit; Type: TABLE; Schema: iq_completeneuro; Owner: -
--

CREATE TABLE iq_completeneuro.completeneuro_full_deposit (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id text,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid double precision,
    zero_pay text,
    billing_entity text,
    ins_comments_denial_code text,
    hospital_state text
);


--
-- Name: bank; Type: TABLE; Schema: iq_confidas; Owner: -
--

CREATE TABLE iq_confidas.bank (
    monthend date,
    bank_deposit_amount double precision
);


--
-- Name: deposit_report; Type: TABLE; Schema: iq_confidas; Owner: -
--

CREATE TABLE iq_confidas.deposit_report (
    date date,
    provider text,
    payment_resource text,
    check_no text,
    payment double precision
);


--
-- Name: doe; Type: TABLE; Schema: iq_confidas; Owner: -
--

CREATE TABLE iq_confidas.doe (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: dos; Type: TABLE; Schema: iq_confidas; Owner: -
--

CREATE TABLE iq_confidas.dos (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: full_ar; Type: TABLE; Schema: iq_confidas; Owner: -
--

CREATE TABLE iq_confidas.full_ar (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: full_deposit_report; Type: TABLE; Schema: iq_confidas; Owner: -
--

CREATE TABLE iq_confidas.full_deposit_report (
    date date,
    provider text,
    payment_resource text,
    check_no text,
    payment double precision
);


--
-- Name: innervate_full_billing; Type: TABLE; Schema: iq_innervate; Owner: -
--

CREATE TABLE iq_innervate.innervate_full_billing (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    patient_id integer,
    initial_filling_date date,
    claim_seq integer,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    procedure_type text,
    or_procedure text,
    billing_folder text,
    tech_name text,
    claim_biller text,
    billing_queue text,
    patient_balance double precision,
    insurance_balance double precision,
    deductible double precision,
    copay double precision,
    co_ins double precision,
    total_adjustments double precision,
    member_id text,
    dob date,
    technician text
);


--
-- Name: innervate_full_deposit; Type: TABLE; Schema: iq_innervate; Owner: -
--

CREATE TABLE iq_innervate.innervate_full_deposit (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id text,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid double precision,
    zero_pay text,
    billing_entity text,
    ins_comments_denial_code text,
    hospital_state text
);


--
-- Name: billing_report_iomhelp; Type: TABLE; Schema: iq_ionm; Owner: -
--

CREATE TABLE iq_ionm.billing_report_iomhelp (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    patient_id integer,
    initial_filing_date date,
    claim_seq integer,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    billing_folder text,
    tech_name text,
    claim_biller text,
    billing_queue text,
    patientbalance double precision,
    insurancebalance double precision,
    deductible double precision,
    copay double precision,
    co_ins double precision,
    procedure text,
    procedure_type text
);


--
-- Name: ccrhistory; Type: TABLE; Schema: iq_ionm; Owner: -
--

CREATE TABLE iq_ionm.ccrhistory (
    client text,
    month text,
    ccr double precision,
    adjusted double precision
);


--
-- Name: ionm_ccr; Type: TABLE; Schema: iq_ionm; Owner: -
--

CREATE TABLE iq_ionm.ionm_ccr (
    client text,
    ccr double precision,
    denial_reason text,
    claim_count double precision,
    value double precision,
    percentage double precision
);


--
-- Name: payment_report; Type: TABLE; Schema: iq_ionm; Owner: -
--

CREATE TABLE iq_ionm.payment_report (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id integer,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid integer,
    zero_pay text,
    billing_entity text,
    deductible double precision,
    co_ins double precision,
    copay double precision,
    payment_type text,
    usmon_hospital_id integer,
    ins_comments_denial_code text,
    hospital_state text,
    procedure text,
    procedure_type text
);


--
-- Name: smartsheet; Type: TABLE; Schema: iq_ionm; Owner: -
--

CREATE TABLE iq_ionm.smartsheet (
    date_of_entry date,
    date_of_update date,
    created_by text,
    modified_by text,
    usmon_claim_id integer,
    pro_tech text,
    patient_name text,
    insurance_type text,
    insurance text,
    initial_allowed_paid_date text,
    initial_allowable double precision,
    initial_payment double precision,
    initiated_by text,
    worked_by text,
    submission_type text,
    cpt text,
    status text,
    open_negotiation_submission_date date,
    open_negotiation_request_amount double precision,
    arbitration_type text,
    law_firm text,
    date_escalated_to_law_firm date,
    idr_submission_date_by_law_firm text,
    payment_received_date date,
    arbitration_payment__amount_posted double precision,
    win_loss_date date
);


--
-- Name: billing_report_neurosurge; Type: TABLE; Schema: iq_neurosurge; Owner: -
--

CREATE TABLE iq_neurosurge.billing_report_neurosurge (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    patient_id integer,
    initial_filing_date date,
    claim_seq integer,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    procedure_type text,
    procedure text,
    billing_folder text,
    tech_name text,
    claim_biller text,
    billing_queue text,
    patientbalance double precision,
    insurancebalance double precision,
    deductible double precision,
    copay double precision,
    co_ins double precision,
    total_adjustment double precision
);


--
-- Name: payment_report; Type: TABLE; Schema: iq_neurosurge; Owner: -
--

CREATE TABLE iq_neurosurge.payment_report (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id integer,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid integer,
    zero_pay text,
    billing_entity text,
    deductible double precision,
    co_ins double precision,
    copay double precision,
    payment_type text,
    usmon_hospital_id integer,
    ins_comments_denial_code text,
    hospital_state text,
    reader text
);


--
-- Name: smartsheet; Type: TABLE; Schema: iq_neurosurge; Owner: -
--

CREATE TABLE iq_neurosurge.smartsheet (
    date_of_entry date,
    date_of_update date,
    created_by text,
    modified_by text,
    pid integer,
    cid integer,
    pro_tech text,
    patient_name text,
    procedure_type text,
    insurance_type text,
    insurance text,
    initial_allowed_paid_date text,
    initial_allowable double precision,
    initial_payment double precision,
    initiated_by text,
    worked_by text,
    submission_type text,
    cpt text,
    status text,
    open_negotiation_submission_date date,
    open_negotiation_request_amount double precision,
    arbitration_type text,
    law_firm text,
    date_escalated_to_law_firm date,
    idr_submission_date_by_law_firm text,
    payment_received_date date,
    arbitration_payment__amount_posted text,
    win_loss_date date
);


--
-- Name: smartsheet_nt; Type: TABLE; Schema: iq_neurosurge; Owner: -
--

CREATE TABLE iq_neurosurge.smartsheet_nt (
    date_entered date,
    date_updated date,
    priority text,
    pid text,
    claim_ text,
    pro___tech text,
    date_of_service date,
    patient_name text,
    entity text,
    status text,
    latest_status_update date,
    payer text,
    third_party text,
    third_party_agent text,
    third_party_agent_contact_information text,
    cpt_negotiation_specific text,
    total_charge_claim_value double precision,
    payer_allowed__negotiated_charge_value double precision,
    payer_initial_offer double precision,
    payer_1st_counter_offer double precision,
    payer_2nd_counter_offer double precision,
    payer_3rd_counter_offer text,
    payer_final_acceptance_amount double precision,
    date_settled date,
    assigned_to text,
    date_payment_processed date,
    eft_check text,
    date_payment_posted date,
    actual_allowable text,
    amount_received double precision,
    patient_cost_share text,
    net_difference_between_faa___allowable text,
    net___rate_of_current_negotiation_final_offer_pa text,
    actual_medicare_charge_value_payer_allowed text,
    reimbursement___rate_of_medicare_charge_value text,
    outstanding_negotiated_balance text,
    created_by text,
    modified_by text
);


--
-- Name: neurowatch_full_billing; Type: TABLE; Schema: iq_neurowatch; Owner: -
--

CREATE TABLE iq_neurowatch.neurowatch_full_billing (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    patient_id integer,
    initial_filling_date date,
    claim_seq integer,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    procedure_type text,
    or_procedure text,
    billing_folder text,
    tech_name text,
    claim_biller text,
    billing_queue text,
    patient_balance double precision,
    insurance_balance double precision,
    deductible double precision,
    copay double precision,
    co_ins double precision,
    total_adjustments double precision
);


--
-- Name: neurowatch_full_deposit; Type: TABLE; Schema: iq_neurowatch; Owner: -
--

CREATE TABLE iq_neurowatch.neurowatch_full_deposit (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id text,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid text,
    zero_pay text,
    billing_entity text,
    ins_comments_denial_code text,
    hospital_state text
);


--
-- Name: invoices_ccr; Type: TABLE; Schema: iq_ops_dashboard; Owner: -
--

CREATE TABLE iq_ops_dashboard.invoices_ccr (
    "Client Name" text NOT NULL,
    "Month with Year" text NOT NULL,
    "Total Deposits (MTD posted total_PMS)" numeric(18,2),
    "Total Invoice" numeric(18,2),
    "Total deposits ( Actual amount sent for Invoicing)" numeric(18,2),
    "Invoiced date" date,
    "Clean Claims Rate" text
);


--
-- Name: roles; Type: TABLE; Schema: iq_ops_dashboard; Owner: -
--

CREATE TABLE iq_ops_dashboard.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    label character varying(80) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: iq_ops_dashboard; Owner: -
--

CREATE SEQUENCE iq_ops_dashboard.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: iq_ops_dashboard; Owner: -
--

ALTER SEQUENCE iq_ops_dashboard.roles_id_seq OWNED BY iq_ops_dashboard.roles.id;


--
-- Name: scorecard; Type: TABLE; Schema: iq_ops_dashboard; Owner: -
--

CREATE TABLE iq_ops_dashboard.scorecard (
    client text,
    reporting_period_end_of_month date,
    reporting_date date,
    days_in_reporting_period integer,
    complete_of_reporting_period text,
    holiday1 date,
    holiday2 date,
    holiday3 double precision,
    tortal_charge double precision,
    billed double precision,
    unbilled double precision,
    charge_goal double precision,
    charge_goal_mtd double precision,
    achieved_of_charge_goal_monthly text,
    achieved_of_charge_goal_mtd text,
    posted_amount_mtd double precision,
    posted_amount_goal double precision,
    posting_goal_mtd double precision,
    achieved_of_psoting_goal_monthly text,
    achieved_of_posting_goal_mtd text,
    total_ins_ar double precision,
    sixty_day_ins_ar double precision,
    nintyplus_day_ins_ar double precision,
    nintyplus_arpercentage double precision,
    total_mtd_bank_deposits double precision,
    achieved_of_deposit_goal_mtd text,
    achieved_of_deposits_goal_monthly text
);


--
-- Name: users; Type: TABLE; Schema: iq_ops_dashboard; Owner: -
--

CREATE TABLE iq_ops_dashboard.users (
    id integer NOT NULL,
    username character varying(60) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: iq_ops_dashboard; Owner: -
--

CREATE SEQUENCE iq_ops_dashboard.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: iq_ops_dashboard; Owner: -
--

ALTER SEQUENCE iq_ops_dashboard.users_id_seq OWNED BY iq_ops_dashboard.users.id;


--
-- Name: adj_report; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.adj_report (
    entry_date date,
    referring_provider text,
    patient_chart_number integer,
    patient_name_last_first text,
    visit_number integer,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    adjustments double precision,
    adjustment_code_category text,
    adjustment_code text,
    adjustment_code_description text,
    facility text,
    transaction_carrier_code text,
    transaction_carrier_name text,
    batch_number integer,
    batch_owner text
);


--
-- Name: bank; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.bank (
    monthend date,
    bank_deposit_amount double precision
);


--
-- Name: ccr; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.ccr (
    client text,
    ccr text,
    denialreason text,
    claimcount integer,
    value double precision,
    percentage text
);


--
-- Name: ccr_history; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.ccr_history (
    client text,
    month text,
    ccr text,
    adjusted text
);


--
-- Name: deposit_report; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.deposit_report (
    deposit_date date,
    referring_provider text,
    patient_chart_number integer,
    patient_name__last__first_ text,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code text,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text
);


--
-- Name: doe; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.doe (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: dos; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.dos (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: full_ar; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.full_ar (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: full_deposit_report; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.full_deposit_report (
    deposit_date date,
    referring_provider text,
    patient_chart_number integer,
    patient_name__last__first_ text,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code text,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text
);


--
-- Name: panel; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.panel (
    type text,
    uid text,
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate text,
    billoccurance text,
    entryuser text,
    procedure text,
    cptcode text,
    catcodepanel text,
    cat text,
    panel text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: pipeline_report; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.pipeline_report (
    grouplocation text,
    accession text,
    ex text,
    patientname text,
    lastname text,
    firstname text,
    toxpcr text,
    panelcode text,
    panelname text,
    dateofbirth date,
    rundate date,
    runby text,
    provider text,
    stat text,
    diagcodes text,
    specimentype text,
    datetimeofcollection date,
    weeknumber integer,
    weekendingdate date,
    curentmonth text,
    curentyear text,
    procedurecode text,
    printeddate text
);


--
-- Name: turnarround_report; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.turnarround_report (
    panel text,
    numberoflines integer,
    avgdostoorderdate double precision,
    avgorderdatetofinalprinteddate double precision,
    avgfinalprinteddatetodoe double precision,
    avgdoetosubmissiondate double precision,
    avgsubmissiondatetopaymentdate double precision
);


--
-- Name: turnarround_report_last12; Type: TABLE; Schema: iq_qfd; Owner: -
--

CREATE TABLE iq_qfd.turnarround_report_last12 (
    panel text,
    numberoflines integer,
    avgdostoorderdate double precision,
    avgorderdatetofinalprinteddate double precision,
    avgfinalprinteddatetodoe double precision,
    avgdoetosubmissiondate double precision,
    avgsubmissiondatetopaymentdate double precision
);


--
-- Name: soleil_billed_service_data; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_billed_service_data (
    trannum integer,
    accountnumber integer,
    ptid_vst text,
    patientname text,
    admitdate date,
    lastbilldate date,
    initialbilldate date,
    paiddate date,
    payerid integer,
    payername text,
    financialclass integer,
    payertype integer,
    policynumber text,
    subscriberpolicynumber text,
    groupnumber text,
    planname text,
    plannumber text,
    totalbilled double precision,
    totalcontractfee double precision,
    balancedue double precision,
    totalpayment double precision,
    totalcontractwriteoff double precision,
    totalothertransactions double precision,
    totalbaddebt double precision,
    totalrefund double precision,
    supplycost double precision,
    staffcost double precision,
    preopicd text,
    alldxcodes text,
    bs1physicianid integer,
    bs1icdproccode text,
    bs1cpt text,
    bs1cptmodifers text,
    bs1dxstring text,
    bs1billcode text,
    bs1linedesc text,
    bs1amtbilled double precision,
    bs1contractfee double precision,
    bs1amountpaid double precision,
    bs2physicianid integer,
    bs2icdproccode text,
    bs2cpt text,
    bs2cptmodifers text,
    bs2dxstring text,
    bs2billcode text,
    bs2linedesc text,
    bs2amtbilled double precision,
    bs2contractfee double precision,
    bs2amountpaid double precision,
    bs3physicianid integer,
    bs3icdproccode text,
    bs3cpt text,
    bs3cptmodifers text,
    bs3dxstring text,
    bs3billcode text,
    bs3linedesc text,
    bs3amtbilled double precision,
    bs3contractfee double precision,
    bs3amountpaid double precision,
    bs4physicianid integer,
    bs4icdproccode text,
    bs4cpt text,
    bs4cptmodifiers text,
    bs4dxstring text,
    bs4billcode text,
    bs4linedesc text,
    bs4amtbilled double precision,
    bs4contractfee double precision,
    bs4amountpaid double precision,
    bs5physicianid integer,
    bs5icdproccode text,
    bs5cpt text,
    bs5cptmodifers text,
    bs5dxstring text,
    bs5billcode text,
    bs5linedesc text,
    bs5amtbilled double precision,
    bs5contractfee double precision,
    bs5amountpaid double precision,
    bs6physicianid integer,
    bs6icdproccode text,
    bs6cpt text,
    bs6cptmodifers text,
    bs6dxstring text,
    bs6billcode text,
    bs6linedesc text,
    bs6amtbilled double precision,
    bs6contractfee double precision,
    bs6amountpaid double precision,
    bs7physicianid integer,
    bs7icdproccode text,
    bs7cpt text,
    bs7cptmodifers text,
    bs7dxstring text,
    bs7billcode text,
    bs7linedesc text,
    bs7amtbilled double precision,
    bs7contractfee double precision,
    bs7amountpaid double precision,
    bs8physicianid integer,
    bs8icdproccode text,
    bs8cpt text,
    bs8cptmodifers text,
    bs8dxstring text,
    bs8billcode text,
    bs8linedesc text,
    bs8amtbilled double precision,
    bs8contractfee double precision,
    bs8amountpaid double precision,
    bs9physicianid integer,
    bs9icdproccode text,
    bs9cpt text,
    bs9cptmodifers text,
    bs9dxstring text,
    bs9billcode text,
    bs9linedesc text,
    bs9amtbilled double precision,
    bs9contractfee double precision,
    bs9amountpaid double precision,
    bs10physicianid integer,
    bs10icdproccode text,
    bs10cpt text,
    bs10cptmodifers text,
    bs10dxstring text,
    bs10billcode text,
    bs10linedesc text,
    bs10amtbilled double precision,
    bs10contractfee double precision,
    bs10amountpaid double precision
);


--
-- Name: soleil_deposit_posted_with_reversal; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_deposit_posted_with_reversal (
    bank text,
    txdate date,
    postdate date,
    txnumber integer,
    txdescription text,
    txstatus text,
    pytype text,
    cctype text,
    refchecknumber text,
    ptacct_vst text,
    patientname text,
    performingphys text,
    applyamt double precision,
    billedamt double precision,
    ttlpayamt double precision,
    trancode text,
    transactionpayer text,
    contract text,
    createby text,
    createdate date,
    changeby text,
    changedate date
);


--
-- Name: soleil_deposit_trandate_reversal_and_negatives; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_deposit_trandate_reversal_and_negatives (
    bank text,
    txdate date,
    postdate date,
    txnumber integer,
    txdescription text,
    txstatus text,
    pytype text,
    cctype text,
    refchecknumber text,
    ptacct_vst text,
    patientname text,
    performingphys text,
    applyamt double precision,
    billedamt double precision,
    ttlpayamt double precision,
    trancode text,
    transactionpayer text,
    contract text,
    createby text,
    createdate date,
    changeby text,
    changedate date
);


--
-- Name: soleil_full_ar; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_full_ar (
    client text,
    carrier integer,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum text,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision,
    state text,
    cid text,
    usmonstatus text,
    entity text,
    collectorusneuro text,
    firstbilldate date,
    billtype text,
    hospitalusneuro text,
    hospitalstateusneuro text,
    inspolicyusneuro text,
    room text,
    proceduretype text,
    refund double precision
);


--
-- Name: soleil_full_deposit; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_full_deposit (
    client text,
    deposit_date date,
    referring_provider text,
    patient_chart_number text,
    patient_name_last_first text,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code integer,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text,
    insurance_type text,
    biller text,
    hospital text,
    hospital_state text,
    billing_entity text,
    contract text,
    cid text,
    bank text,
    visit_number text,
    charge double precision
);


--
-- Name: soleil_last12_ar_begindos; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_last12_ar_begindos (
    client text,
    carrier integer,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum text,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision,
    state text,
    cid text,
    usmonstatus text,
    entity text,
    collectorusneuro text,
    firstbilldate date,
    billtype text,
    hospitalusneuro text,
    hospitalstateusneuro text,
    inspolicyusneuro text,
    room text,
    proceduretype text,
    refund double precision
);


--
-- Name: soleil_last12_ar_doe; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_last12_ar_doe (
    client text,
    carrier integer,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum text,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision,
    state text,
    cid text,
    usmonstatus text,
    entity text,
    collectorusneuro text,
    firstbilldate date,
    billtype text,
    hospitalusneuro text,
    hospitalstateusneuro text,
    inspolicyusneuro text,
    room text,
    proceduretype text,
    refund double precision
);


--
-- Name: soleil_last12months_deposit; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_last12months_deposit (
    client text,
    deposit_date date,
    referring_provider text,
    patient_chart_number text,
    patient_name_last_first text,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code integer,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text,
    insurance_type text,
    biller text,
    hospital text,
    hospital_state text,
    billing_entity text,
    contract text,
    cid text,
    bank text,
    visit_number text,
    charge double precision
);


--
-- Name: soleil_payer_list; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_payer_list (
    payerid integer,
    payername text,
    financialclasscode integer,
    financialclassdesc text,
    payertypecode integer,
    payertypedesc text,
    payertype integer,
    claimformat text,
    status text,
    sendecs text
);


--
-- Name: soleil_profit_cost_by_procedure; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_profit_cost_by_procedure (
    primaryproc text,
    casecount integer,
    grossbilling double precision,
    exprevenue double precision,
    actpayment double precision,
    directcost double precision,
    indirectcost double precision,
    totalcost double precision,
    netprofit double precision,
    pctexprev text,
    pctactualpay text,
    physician text,
    casecountphys integer,
    grossbillingphys double precision,
    exprevenuephys double precision,
    actpaymentphys double precision,
    directcostphys double precision,
    indirectcostphys double precision,
    totalcostphys double precision,
    netprofitphys double precision,
    pctexprevphys text,
    pctactualpayphys text,
    gtcasecount integer,
    gtgrossbilling double precision,
    gtexprevenue double precision,
    gtactpayment double precision,
    gtdirectcost double precision,
    gtindirectcost double precision,
    gtcost double precision,
    gtnetprofit double precision,
    gtpctexprev text,
    gtpctactualpay text
);


--
-- Name: soleil_profit_cost_by_speciality; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_profit_cost_by_speciality (
    specialty text,
    casecount integer,
    grossbilling double precision,
    exprevenue double precision,
    actpayment double precision,
    directcost double precision,
    indirectcost double precision,
    totalcost double precision,
    netprofit double precision,
    pctexprev text,
    pctactualpay text,
    cpt text,
    casecountcpt integer,
    grossbillingcpt double precision,
    exprevenuecpt double precision,
    actpaymentcpt double precision,
    directcostcpt double precision,
    indirectcostcpt double precision,
    totalcostcpt double precision,
    netprofitcpt double precision,
    pctexprevcpt text,
    pctactualpaycpt text,
    gtcasetcount integer,
    gtgrossbilling double precision,
    gtexprevenue double precision,
    gtactpayment double precision,
    gtdirectcost double precision,
    gtindirectcost double precision,
    gtcost double precision,
    gtnetprofit double precision,
    gtpctexprev text,
    gtpctactualpay text
);


--
-- Name: soleil_transaction_information; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_transaction_information (
    printingselection text,
    sortby text,
    groupby text,
    txdate date,
    txnumber integer,
    postdate date,
    txstatus text,
    description text,
    amount double precision,
    payerid integer,
    account_visit text,
    patientname text,
    physicianid integer,
    dateofservice date,
    acctyear integer,
    acctperiod integer,
    changeby text,
    groupparam text,
    bl integer,
    sb integer,
    ac integer,
    fc integer,
    py integer,
    cw integer,
    ad integer,
    rf integer,
    bd integer
);


--
-- Name: soleil_tx_info; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_tx_info (
    printingselection text,
    sortparam text,
    txdate date,
    txnumber integer,
    postdate date,
    txstatus text,
    description text,
    amount double precision,
    payerid integer,
    account_visit text,
    patientname text,
    visitcategory text,
    physicianid integer,
    dateofservice date,
    acctyear integer,
    acctperiod integer,
    changeby text,
    groupparam text,
    blcnt integer,
    sbcnt integer,
    accnt integer,
    fccnt integer,
    pycnt integer,
    cwcnt integer,
    adcnt integer,
    rfcnt integer,
    bdcnt integer
);


--
-- Name: soleil_visit_aging_balance; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_visit_aging_balance (
    accountvisit text,
    visitcategory text,
    patientname text,
    dateofservice date,
    billedamount double precision,
    balancedue double precision,
    age text,
    currentpayer_1 integer,
    currentpayername text,
    lasttxno integer,
    lasttxdate date,
    groupparam text,
    casecount text,
    grpbillamt double precision,
    grpbaldue double precision
);


--
-- Name: soleil_visitbilling; Type: TABLE; Schema: iq_soleil; Owner: -
--

CREATE TABLE iq_soleil.soleil_visitbilling (
    acct integer,
    ptidvst text,
    patientname text,
    accounttitle text,
    dos date,
    datebilled date,
    datepaid date,
    physid integer,
    physname text,
    spec1 text,
    spec2 text,
    cpt1 text,
    description1 text,
    cpt1modifiers text,
    cpt2 text,
    description2 text,
    cpt2modifiers2 text,
    cpt3 text,
    description3 text,
    cpt3modifiers3 text,
    cpt4 text,
    description4 text,
    cpt4modifiers4 text,
    cpt5 text,
    description5 text,
    cpt5modifiers5 text,
    cpt6 text,
    description6 text,
    cpt6modifiers6 text,
    cpt7 text,
    description7 text,
    cpt7modifiers7 text,
    cpt8 text,
    description8 text,
    cpt8modifiers8 text,
    cpt9 text,
    description9 text,
    cpt9modifiers9 text,
    cpt10 text,
    description10 text,
    cpt10modifiers10 text,
    primdiag text,
    preopmin integer,
    ormin integer,
    srgymin integer,
    rrmin integer,
    room text,
    anestype text,
    asa text,
    primfc integer,
    payer integer,
    name text,
    policynumber text,
    policytype text,
    subscriberpolicynumber text,
    groupnumber text,
    supplycost text,
    staffcost double precision,
    billedamt double precision,
    contractfee double precision,
    payments double precision,
    cwoff double precision,
    adjustment double precision,
    financecharge double precision,
    additionalcharge double precision,
    refund double precision,
    baddebt double precision,
    balancedue double precision,
    additionalid_1 text,
    medicalrecord text,
    dateofbirth date,
    planname text,
    plannumber text,
    scheduledprocedurecode text,
    scheduledproceduredescription text,
    physiciannpi text,
    innetcopay double precision,
    innetdeductible double precision,
    cpt1revcode integer,
    cpt2revcode integer,
    cpt3revcode integer,
    cpt4revcode integer,
    cpt5revcode integer,
    cpt6revcode integer,
    cpt7revcode integer,
    cpt8revcode integer,
    cpt9revcode integer,
    cpt10revcode integer,
    datescheduled date,
    patienttype text,
    sex text,
    zipcode text,
    implantcost text,
    anescategory text,
    initialbilldate date,
    selfpaydate text,
    visitcategory text,
    firststatementdate text,
    subscriberemployerid text,
    subscriberemployername text,
    billdays text,
    authorizationnumber text,
    authcompletedate text,
    patientarrival text,
    orstart text,
    orend text,
    srgystart text,
    srgyend text,
    patientdischarge text,
    followupdate text,
    patientfollowup text,
    status text,
    totalsupplies text
);


--
-- Name: synapses_full_billing; Type: TABLE; Schema: iq_synapses; Owner: -
--

CREATE TABLE iq_synapses.synapses_full_billing (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    activity text,
    modifier text,
    patient_id integer,
    claim_seq integer,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    collector text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    cpt text,
    pos text,
    ins_policy_hash text,
    last_note_date date,
    procedure_type text,
    or_procedure text,
    date_collected date,
    plan_type text,
    diagnosis_code_1 text,
    diagnosis_code_2 text,
    diagnosis_code_3 text,
    diagnosis_code_4 text,
    note_type text,
    last_billing_note text,
    status_code text,
    employer text,
    coverage text,
    funding_type text
);


--
-- Name: synapses_full_deposit; Type: TABLE; Schema: iq_synapses; Owner: -
--

CREATE TABLE iq_synapses.synapses_full_deposit (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    eob_date date,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id text,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid double precision,
    zero_pay double precision,
    billing_entity text,
    denial_reason text,
    plan_type text,
    ins_comments_denial_code text,
    hospital_state text,
    denial_reason_1 text
);


--
-- Name: audit_schedulling; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.audit_schedulling (
    patient text,
    dos date,
    room text,
    appttime text,
    appttype text,
    procedure text,
    schedby text,
    scheddate date,
    lastchangedby text,
    lastchangeddate date,
    cancelled text,
    grpvalue text,
    grptotappt text,
    grptotproc text,
    grptotcancelled text,
    gtappt text,
    gtproc text,
    gtcancelled text,
    procdesc text,
    physician text,
    physician_performed text,
    payer_performed integer
);


--
-- Name: bank; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.bank (
    date_ date,
    financial_institution text,
    account_number text,
    name text,
    amount text,
    description text,
    payment_details text,
    extended_payment_details text
);


--
-- Name: billed_service_data; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.billed_service_data (
    trannum integer,
    accountnumber integer,
    ptid_vst text,
    patientname text,
    admitdate date,
    lastbilldate date,
    initialbilldate date,
    paiddate date,
    payerid integer,
    payername text,
    financialclass integer,
    payertype integer,
    policynumber text,
    subscriberpolicynumber text,
    groupnumber text,
    planname text,
    plannumber text,
    totalbilled text,
    totalcontractfee text,
    balancedue text,
    totalpayment text,
    totalcontractwriteoff text,
    totalothertransactions text,
    totalbaddebt text,
    totalrefund text,
    supplycost text,
    staffcost text,
    preopicd text,
    alldxcodes text,
    bs1physicianid integer,
    bs1icdproccode text,
    bs1cpt text,
    bs1cptmodifers text,
    bs1dxstring text,
    bs1billcode integer,
    bs1linedesc text,
    bs1amtbilled text,
    bs1contractfee text,
    bs1amountpaid text,
    bs2physicianid integer,
    bs2icdproccode text,
    bs2cpt text,
    bs2cptmodifers text,
    bs2dxstring text,
    bs2billcode integer,
    bs2linedesc text,
    bs2amtbilled text,
    bs2contractfee text,
    bs2amountpaid text,
    bs3physicianid integer,
    bs3icdproccode text,
    bs3cpt text,
    bs3cptmodifers text,
    bs3dxstring text,
    bs3billcode integer,
    bs3linedesc text,
    bs3amtbilled text,
    bs3contractfee text,
    bs3amountpaid text,
    bs4physicianid integer,
    bs4icdproccode text,
    bs4cpt text,
    bs4cptmodifiers text,
    bs4dxstring text,
    bs4billcode integer,
    bs4linedesc text,
    bs4amtbilled text,
    bs4contractfee text,
    bs4amountpaid text,
    bs5physicianid integer,
    bs5icdproccode text,
    bs5cpt text,
    bs5cptmodifers text,
    bs5dxstring text,
    bs5billcode integer,
    bs5linedesc text,
    bs5amtbilled text,
    bs5contractfee text,
    bs5amountpaid text,
    bs6physicianid integer,
    bs6icdproccode text,
    bs6cpt text,
    bs6cptmodifers text,
    bs6dxstring text,
    bs6billcode integer,
    bs6linedesc text,
    bs6amtbilled text,
    bs6contractfee text,
    bs6amountpaid text,
    bs7physicianid integer,
    bs7icdproccode text,
    bs7cpt text,
    bs7cptmodifers text,
    bs7dxstring text,
    bs7billcode integer,
    bs7linedesc text,
    bs7amtbilled text,
    bs7contractfee text,
    bs7amountpaid text,
    bs8physicianid text,
    bs8icdproccode text,
    bs8cpt text,
    bs8cptmodifers text,
    bs8dxstring text,
    bs8billcode text,
    bs8linedesc text,
    bs8amtbilled text,
    bs8contractfee text,
    bs8amountpaid text,
    bs9physicianid text,
    bs9icdproccode text,
    bs9cpt text,
    bs9cptmodifers text,
    bs9dxstring text,
    bs9billcode text,
    bs9linedesc text,
    bs9amtbilled text,
    bs9contractfee text,
    bs9amountpaid text,
    bs10physicianid text,
    bs10icdproccode text,
    bs10cpt text,
    bs10cptmodifers text,
    bs10dxstring text,
    bs10billcode text,
    bs10linedesc text,
    bs10amtbilled text,
    bs10contractfee text,
    bs10amountpaid text
);


--
-- Name: ccr; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.ccr (
    client text,
    ccr double precision,
    denial_reason text,
    claim_count double precision,
    value double precision,
    percentage double precision
);


--
-- Name: ccrhistory; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.ccrhistory (
    client text,
    month text,
    ccr double precision,
    adjusted double precision
);


--
-- Name: deposit_posted_with_reversal; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.deposit_posted_with_reversal (
    bank text,
    txdate date,
    postdate date,
    txnumber integer,
    txdescription text,
    txstatus text,
    pytype text,
    cctype text,
    refchecknumber text,
    ptacct_vst text,
    patientname text,
    performingphys text,
    applyamt double precision,
    billedamt double precision,
    ttlpayamt double precision,
    trancode text,
    transactionpayer text,
    contract text,
    createby text,
    createdate date,
    changeby text,
    changedate date
);


--
-- Name: deposit_trandate_reversal_and_negatives; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.deposit_trandate_reversal_and_negatives (
    bank text,
    txdate date,
    postdate date,
    txnumber integer,
    txdescription text,
    txstatus text,
    pytype text,
    cctype text,
    refchecknumber text,
    ptacct_vst text,
    patientname text,
    performingphys text,
    applyamt double precision,
    billedamt double precision,
    ttlpayamt double precision,
    trancode text,
    transactionpayer text,
    contract text,
    createby text,
    createdate date,
    changeby text,
    changedate date
);


--
-- Name: full_ar; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.full_ar (
    client text,
    carrier integer,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum text,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision,
    state text,
    cid text,
    usmonstatus text,
    entity text,
    collectorusneuro text,
    firstbilldate date,
    billtype text,
    hospitalusneuro text,
    hospitalstateusneuro text,
    inspolicyusneuro text,
    room text,
    proceduretype text,
    refund double precision
);


--
-- Name: full_deposit; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.full_deposit (
    client text,
    deposit_date date,
    referring_provider text,
    patient_chart_number text,
    patient_name_last_first text,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code integer,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text,
    insurance_type text,
    biller text,
    hospital text,
    hospital_state text,
    billing_entity text,
    contract text,
    cid text,
    bank text,
    visit_number text,
    charge double precision
);


--
-- Name: last12_ar_begindos; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.last12_ar_begindos (
    client text,
    carrier integer,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum text,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision,
    state text,
    cid text,
    usmonstatus text,
    entity text,
    collectorusneuro text,
    firstbilldate date,
    billtype text,
    hospitalusneuro text,
    hospitalstateusneuro text,
    inspolicyusneuro text,
    room text,
    proceduretype text,
    refund double precision
);


--
-- Name: last12_ar_doe; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.last12_ar_doe (
    client text,
    carrier integer,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum integer,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum text,
    clientaccnum text,
    accession text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate date,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision,
    state text,
    cid text,
    usmonstatus text,
    entity text,
    collectorusneuro text,
    firstbilldate date,
    billtype text,
    hospitalusneuro text,
    hospitalstateusneuro text,
    inspolicyusneuro text,
    room text,
    proceduretype text,
    refund double precision
);


--
-- Name: last12months_deposit; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.last12months_deposit (
    client text,
    deposit_date date,
    referring_provider text,
    patient_chart_number text,
    patient_name_last_first text,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code integer,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text,
    insurance_type text,
    biller text,
    hospital text,
    hospital_state text,
    billing_entity text,
    contract text,
    cid text,
    bank text,
    visit_number text,
    charge double precision
);


--
-- Name: payer_list; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.payer_list (
    payerid integer,
    payername text,
    financialclasscode integer,
    financialclassdesc text,
    payertypecode integer,
    payertypedesc text,
    payertype integer,
    claimformat text,
    status text,
    sendecs text
);


--
-- Name: profit_cost_by_procedure; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.profit_cost_by_procedure (
    primaryproc text,
    casecount integer,
    grossbilling text,
    exprevenue text,
    actpayment text,
    directcost text,
    indirectcost text,
    totalcost text,
    netprofit text,
    pctexprev text,
    pctactualpay text,
    physician text,
    casecountphys integer,
    grossbillingphys text,
    exprevenuephys text,
    actpaymentphys text,
    directcostphys text,
    indirectcostphys text,
    totalcostphys text,
    netprofitphys text,
    pctexprevphys text,
    pctactualpayphys text,
    gtcasecount integer,
    gtgrossbilling text,
    gtexprevenue text,
    gtactpayment text,
    gtdirectcost text,
    gtindirectcost text,
    gtcost text,
    gtnetprofit text,
    gtpctexprev text,
    gtpctactualpay text
);


--
-- Name: profit_cost_by_speciality; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.profit_cost_by_speciality (
    specialty text,
    casecount integer,
    grossbilling text,
    exprevenue text,
    actpayment text,
    directcost text,
    indirectcost text,
    totalcost text,
    netprofit text,
    pctexprev text,
    pctactualpay text,
    cpt text,
    casecountcpt integer,
    grossbillingcpt text,
    exprevenuecpt text,
    actpaymentcpt text,
    directcostcpt text,
    indirectcostcpt text,
    totalcostcpt text,
    netprofitcpt text,
    pctexprevcpt text,
    pctactualpaycpt text,
    gtcasetcount integer,
    gtgrossbilling text,
    gtexprevenue text,
    gtactpayment text,
    gtdirectcost text,
    gtindirectcost text,
    gtcost text,
    gtnetprofit text,
    gtpctexprev text,
    gtpctactualpay text
);


--
-- Name: specalitycode; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.specalitycode (
    procedure text,
    description text,
    status text,
    specialtycode text,
    specialtydescription text
);


--
-- Name: transaction_information; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.transaction_information (
    printingselection text,
    sortby text,
    groupby text,
    txdate date,
    txnumber integer,
    postdate date,
    txstatus text,
    description text,
    amount double precision,
    payerid integer,
    account_visit text,
    patientname text,
    physicianid integer,
    dateofservice date,
    acctyear integer,
    acctperiod integer,
    changeby text,
    groupparam text,
    bl integer,
    sb integer,
    ac integer,
    fc integer,
    py integer,
    cw integer,
    ad integer,
    rf integer,
    bd integer
);


--
-- Name: tx_info; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.tx_info (
    printingselection text,
    sortparam text,
    txdate date,
    txnumber integer,
    postdate date,
    txstatus text,
    description text,
    amount double precision,
    payerid integer,
    account_visit text,
    patientname text,
    visitcategory text,
    physicianid integer,
    dateofservice date,
    acctyear integer,
    acctperiod integer,
    changeby text,
    groupparam text,
    blcnt integer,
    sbcnt integer,
    accnt integer,
    fccnt integer,
    pycnt integer,
    cwcnt integer,
    adcnt integer,
    rfcnt integer,
    bdcnt integer
);


--
-- Name: visit_aging_balance; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.visit_aging_balance (
    accountvisit text,
    visitcategory text,
    patientname text,
    dateofservice date,
    billedamount text,
    balancedue text,
    age text,
    currentpayer_1 text,
    currentpayername text,
    lasttxno text,
    lasttxdate date,
    groupparam text,
    casecount text,
    grpbillamt text,
    grpbaldue text
);


--
-- Name: visitbilling; Type: TABLE; Schema: iq_tsh; Owner: -
--

CREATE TABLE iq_tsh.visitbilling (
    acct integer,
    ptidvst text,
    patientname text,
    accounttitle text,
    dos date,
    datebilled date,
    datepaid date,
    physid integer,
    physname text,
    spec1 text,
    spec2 text,
    cpt1 text,
    description1 text,
    cpt1modifiers text,
    cpt2 text,
    description2 text,
    cpt2modifiers2 text,
    cpt3 text,
    description3 text,
    cpt3modifiers3 text,
    cpt4 text,
    description4 text,
    cpt4modifiers4 text,
    cpt5 text,
    description5 text,
    cpt5modifiers5 text,
    cpt6 text,
    description6 text,
    cpt6modifiers6 text,
    cpt7 text,
    description7 text,
    cpt7modifiers7 text,
    cpt8 text,
    description8 text,
    cpt8modifiers8 text,
    cpt9 text,
    description9 text,
    cpt9modifiers9 text,
    cpt10 text,
    description10 text,
    cpt10modifiers10 text,
    primdiag text,
    preopmin integer,
    ormin integer,
    srgymin integer,
    rrmin integer,
    room text,
    anestype text,
    asa text,
    primfc integer,
    payer integer,
    name text,
    policynumber text,
    policytype text,
    subscriberpolicynumber text,
    groupnumber text,
    supplycost double precision,
    staffcost double precision,
    billedamt double precision,
    contractfee double precision,
    payments double precision,
    cwoff double precision,
    adjustment double precision,
    financecharge double precision,
    additionalcharge double precision,
    refund double precision,
    baddebt double precision,
    balancedue double precision,
    additionalid_1 text,
    medicalrecord text,
    dateofbirth date,
    planname text,
    plannumber text,
    scheduledprocedurecode text,
    scheduledproceduredescription text,
    physiciannpi text,
    innetcopay double precision,
    innetdeductible double precision,
    cpt1revcode text,
    cpt2revcode text,
    cpt3revcode text,
    cpt4revcode text,
    cpt5revcode text,
    cpt6revcode text,
    cpt7revcode text,
    cpt8revcode text,
    cpt9revcode text,
    cpt10revcode text,
    datescheduled date,
    patienttype text,
    sex text,
    zipcode text,
    implantcost double precision,
    anescategory text,
    initialbilldate date,
    selfpaydate date,
    visitcategory text,
    firststatementdate date,
    subscriberemployerid text,
    subscriberemployername text,
    billdays integer,
    authorizationnumber text,
    authcompletedate text,
    patientarrival text,
    orstart text,
    orend text,
    srgystart text,
    srgyend text,
    patientdischarge text,
    followupdate text,
    patientfollowup text,
    status text,
    totalsupplies double precision
);


--
-- Name: adj_report; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph.adj_report (
    entry_date date,
    provider text,
    referring_provider text,
    patient_chart_number text,
    patient_name_last_first text,
    service_date date,
    cpt_code text,
    cpt_code_description text,
    adjustments text,
    adjustment_code_category text,
    adjustment_code text,
    adjustment_code_description text,
    facility text,
    transaction_carrier_code text,
    transaction_carrier_name text,
    batch_number text,
    batch_owner text
);


--
-- Name: ccr_history; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph.ccr_history (
    client text,
    month text,
    ccr text,
    adjusted text
);


--
-- Name: deposit_report; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph.deposit_report (
    deposit_date date,
    provider text,
    referring_provider text,
    patient_chart_number text,
    patient_name_last_first text,
    service_date date,
    visit_number text,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code text,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text
);


--
-- Name: doe; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph.doe (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum text,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum text,
    begindos date,
    enddos date,
    doe date,
    lastbilldate text,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: doe old; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph."doe old" (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum text,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    begindos date,
    enddos date,
    doe date,
    lastbilldate text,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: dos; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph.dos (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum text,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    begindos date,
    enddos date,
    doe date,
    lastbilldate text,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: full_ar; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph.full_ar (
    carrier text,
    financialclass text,
    provider text,
    referringprovider text,
    facility text,
    chartnum text,
    patientname text,
    dob date,
    responsibleparty text,
    subscriberid text,
    visitnum integer,
    begindos date,
    enddos date,
    doe date,
    lastbilldate text,
    billoccurance text,
    entryuser text,
    procedure text,
    pos text,
    tos text,
    modifier text,
    primarydiagnosis text,
    totalcharge double precision,
    totalallowed double precision,
    carrierpayment double precision,
    carrierwo double precision,
    patientpayment double precision,
    patientwo double precision,
    carrierbalance double precision,
    patientbalance double precision,
    totalbalance double precision
);


--
-- Name: full_deposit_report; Type: TABLE; Schema: iq_txph; Owner: -
--

CREATE TABLE iq_txph.full_deposit_report (
    deposit_date date,
    provider text,
    referring_provider text,
    patient_chart_number text,
    patient_name_last_first text,
    service_date date,
    visit_number text,
    cpt_code text,
    cpt_code_description text,
    charge_code text,
    payments double precision,
    insurance_payments double precision,
    patient_payments double precision,
    unapplied_payments double precision,
    batch_number text,
    facility text,
    batch_owner text,
    payment_method text,
    payment_code text,
    payment_code_description text,
    check_number text,
    transaction_carrier_code text,
    transaction_carrier_name text
);


--
-- Name: usneuro_ccr; Type: TABLE; Schema: iq_usneuro; Owner: -
--

CREATE TABLE iq_usneuro.usneuro_ccr (
    client text,
    ccr double precision,
    denial_reason text,
    claim_count double precision,
    value double precision,
    percentage double precision
);


--
-- Name: usneuro_ccrhistory; Type: TABLE; Schema: iq_usneuro; Owner: -
--

CREATE TABLE iq_usneuro.usneuro_ccrhistory (
    client text,
    month text,
    ccr double precision,
    adjusted double precision
);


--
-- Name: usneuro_full_billing; Type: TABLE; Schema: iq_usneuro; Owner: -
--

CREATE TABLE iq_usneuro.usneuro_full_billing (
    full_name text,
    dos date,
    insurance_type text,
    insurance_company_name text,
    state text,
    activity text,
    modifier text,
    patient_id integer,
    claim_seq integer,
    usmon_status text,
    charged double precision,
    allowed double precision,
    collected double precision,
    refund double precision,
    write_off double precision,
    total_balance double precision,
    entity text,
    collector text,
    surgeon text,
    billing_date date,
    billtype text,
    hospital text,
    hospital_state text,
    region text,
    reader text,
    cpt text,
    pos text,
    ins_policy_hash text,
    last_note_date date,
    procedure_type text,
    or_procedure text,
    date_collected date,
    plan_type text,
    denial_reason_1 text,
    denial_reason_2 text,
    biller_employee text,
    diagnosis_code_1 text,
    diagnosis_code_2 text,
    diagnosis_code_3 text,
    diagnosis_code_4 text,
    note_type text,
    last_billing_note text,
    status_code text,
    employer text,
    coverage text,
    funding_type text,
    clm_status text,
    biller text
);


--
-- Name: usneuro_full_deposit; Type: TABLE; Schema: iq_usneuro; Owner: -
--

CREATE TABLE iq_usneuro.usneuro_full_deposit (
    first_name text,
    last_name text,
    full_name text,
    tech text,
    region_id integer,
    client_id integer,
    region_short_name text,
    claim_seq integer,
    check_no text,
    dos date,
    date_collected date,
    charge double precision,
    payment_collected double precision,
    patient_id integer,
    pat_name text,
    biller text,
    biller_id integer,
    biller2_id integer,
    biller_agent_id text,
    billing_type text,
    agent2 text,
    reader1_id integer,
    surgeon_id integer,
    surgeon text,
    company1_id integer,
    payer text,
    hospital text,
    insurance_type text,
    patientpaid double precision,
    zero_pay text,
    billing_entity text,
    denial_reason text,
    plan_type text,
    ins_comments_denial_code text,
    hospital_state text,
    payment_type text,
    denial_reason_1 text
);


--
-- Name: roles id; Type: DEFAULT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.roles ALTER COLUMN id SET DEFAULT nextval('iq_ops_dashboard.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.users ALTER COLUMN id SET DEFAULT nextval('iq_ops_dashboard.users_id_seq'::regclass);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: invoices_ccr uq_invoices_ccr_tidy; Type: CONSTRAINT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.invoices_ccr
    ADD CONSTRAINT uq_invoices_ccr_tidy UNIQUE ("Client Name", "Month with Year");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: iq_ops_dashboard; Owner: -
--

CREATE INDEX idx_users_role_id ON iq_ops_dashboard.users USING btree (role_id);


--
-- Name: idx_users_username; Type: INDEX; Schema: iq_ops_dashboard; Owner: -
--

CREATE INDEX idx_users_username ON iq_ops_dashboard.users USING btree (username);


--
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES iq_ops_dashboard.users(id) ON DELETE SET NULL;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: iq_ops_dashboard; Owner: -
--

ALTER TABLE ONLY iq_ops_dashboard.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES iq_ops_dashboard.roles(id);


--
-- PostgreSQL database dump complete
--

