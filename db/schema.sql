--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alert_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_history (
    id text NOT NULL,
    alert_id text NOT NULL,
    event_type text NOT NULL,
    at timestamp with time zone NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT alert_history_event_type_check CHECK ((event_type = ANY (ARRAY['OPENED'::text, 'UPDATED'::text, 'RESOLVED'::text, 'AUTO_RESOLVED'::text])))
);


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id text NOT NULL,
    legal_entity_id text NOT NULL,
    rule_code text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT alerts_severity_check CHECK ((severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])))
);


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    producer_id text,
    CONSTRAINT app_users_role_check CHECK ((role = ANY (ARRAY['ADMIN'::text, 'ANALYST'::text, 'PRODUCER'::text])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    actor_user_id text NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: crops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crops (
    id text NOT NULL,
    ranch_id text NOT NULL,
    tipo text NOT NULL,
    temporada text NOT NULL,
    CONSTRAINT crops_tipo_check CHECK ((tipo = ANY (ARRAY['FRESA'::text, 'FRAMBUESA'::text, 'ARANDANO'::text, 'MORA'::text])))
);


--
-- Name: financial_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_snapshots (
    id text NOT NULL,
    legal_entity_id text NOT NULL,
    periodo text NOT NULL,
    liquidez double precision NOT NULL,
    endeudamiento_pct double precision NOT NULL,
    ingresos_anuales double precision NOT NULL,
    egresos_anuales double precision NOT NULL,
    notas text,
    source_job_id text
);


--
-- Name: integration_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_events (
    id text NOT NULL,
    job_id text,
    validation_task_id text,
    provider text NOT NULL,
    operation text NOT NULL,
    status text NOT NULL,
    correlation_id text NOT NULL,
    attempt integer NOT NULL,
    message text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT integration_events_attempt_check CHECK ((attempt >= 0)),
    CONSTRAINT integration_events_status_check CHECK ((status = ANY (ARRAY['SUCCESS'::text, 'RETRYING'::text, 'FAILED'::text])))
);


--
-- Name: legal_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entities (
    id text NOT NULL,
    producer_id text NOT NULL,
    rfc text NOT NULL,
    tipo text NOT NULL,
    poderes_vigentes_at timestamp with time zone,
    status text NOT NULL,
    CONSTRAINT legal_entities_status_check CHECK ((status = ANY (ARRAY['PENDIENTE'::text, 'OK'::text, 'RISK'::text, 'FAIL'::text]))),
    CONSTRAINT legal_entities_tipo_check CHECK ((tipo = ANY (ARRAY['MORAL'::text, 'FISICA'::text])))
);


--
-- Name: monitoring_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_jobs (
    id text NOT NULL,
    validation_task_id text NOT NULL,
    legal_entity_id text NOT NULL,
    tipo text NOT NULL,
    modo text NOT NULL,
    status text NOT NULL,
    idempotency_key text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 4 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    locked_by text,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    claim_token integer DEFAULT 0 NOT NULL,
    CONSTRAINT monitoring_jobs_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT monitoring_jobs_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT monitoring_jobs_modo_check CHECK ((modo = ANY (ARRAY['ONE_SHOT'::text, 'RECURRENTE'::text]))),
    CONSTRAINT monitoring_jobs_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'RETRY'::text, 'COMPLETED'::text, 'FAILED'::text]))),
    CONSTRAINT monitoring_jobs_tipo_check CHECK ((tipo = ANY (ARRAY['SAT'::text, 'IMSS'::text, 'FINANCIERA'::text, 'LEGAL'::text])))
);


--
-- Name: producers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producers (
    id text NOT NULL,
    display_name text NOT NULL,
    rfc text NOT NULL,
    zona text NOT NULL,
    contacto text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    status text,
    profile jsonb DEFAULT '{}'::jsonb NOT NULL,
    cultivo text,
    distrito text,
    nombre_area_cultivo text,
    productor text,
    id_cofibe_cg text,
    numero_productor text,
    razon_social text,
    representante_legal text,
    direccion_fiscal text,
    colonia text,
    municipio text,
    estado text,
    codigo_postal text,
    nombre_contacto text,
    telefono_contacto text,
    numero_celular text,
    correo_electronico text,
    correo_electronico_productor text,
    CONSTRAINT producers_status_check CHECK ((status = ANY (ARRAY['PENDIENTE'::text, 'OK'::text, 'RISK'::text, 'FAIL'::text])))
);


--
-- Name: provider_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_rate_limits (
    provider text NOT NULL,
    next_available_at timestamp with time zone NOT NULL
);


--
-- Name: ranches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranches (
    id text NOT NULL,
    producer_id text NOT NULL,
    nombre text NOT NULL,
    zona text NOT NULL,
    hectareas double precision NOT NULL,
    empleados integer NOT NULL
);


--
-- Name: rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rules (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    severity_default text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    evaluator_type text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT rules_evaluator_type_check CHECK ((evaluator_type = ANY (ARRAY['THRESHOLD'::text, 'BOOLEAN'::text, 'CUSTOM'::text]))),
    CONSTRAINT rules_severity_default_check CHECK ((severity_default = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: validation_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_tasks (
    id text NOT NULL,
    legal_entity_id text NOT NULL,
    tipo text NOT NULL,
    modo text NOT NULL,
    estado text NOT NULL,
    executed_at timestamp with time zone NOT NULL,
    payload_in jsonb DEFAULT '{}'::jsonb NOT NULL,
    payload_out jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT validation_tasks_estado_check CHECK ((estado = ANY (ARRAY['PENDIENTE'::text, 'OK'::text, 'RISK'::text, 'FAIL'::text]))),
    CONSTRAINT validation_tasks_modo_check CHECK ((modo = ANY (ARRAY['ONE_SHOT'::text, 'RECURRENTE'::text]))),
    CONSTRAINT validation_tasks_tipo_check CHECK ((tipo = ANY (ARRAY['SAT'::text, 'IMSS'::text, 'FINANCIERA'::text, 'LEGAL'::text])))
);


--
-- Name: alert_history alert_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_history
    ADD CONSTRAINT alert_history_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_email_key UNIQUE (email);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: crops crops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crops
    ADD CONSTRAINT crops_pkey PRIMARY KEY (id);


--
-- Name: financial_snapshots financial_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_snapshots
    ADD CONSTRAINT financial_snapshots_pkey PRIMARY KEY (id);


--
-- Name: integration_events integration_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_events
    ADD CONSTRAINT integration_events_pkey PRIMARY KEY (id);


--
-- Name: legal_entities legal_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entities
    ADD CONSTRAINT legal_entities_pkey PRIMARY KEY (id);


--
-- Name: monitoring_jobs monitoring_jobs_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_jobs
    ADD CONSTRAINT monitoring_jobs_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: monitoring_jobs monitoring_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_jobs
    ADD CONSTRAINT monitoring_jobs_pkey PRIMARY KEY (id);


--
-- Name: monitoring_jobs monitoring_jobs_validation_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_jobs
    ADD CONSTRAINT monitoring_jobs_validation_task_id_key UNIQUE (validation_task_id);


--
-- Name: producers producers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producers
    ADD CONSTRAINT producers_pkey PRIMARY KEY (id);


--
-- Name: provider_rate_limits provider_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_rate_limits
    ADD CONSTRAINT provider_rate_limits_pkey PRIMARY KEY (provider);


--
-- Name: ranches ranches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranches
    ADD CONSTRAINT ranches_pkey PRIMARY KEY (id);


--
-- Name: rules rules_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_code_key UNIQUE (code);


--
-- Name: rules rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rules
    ADD CONSTRAINT rules_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: validation_tasks validation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_tasks
    ADD CONSTRAINT validation_tasks_pkey PRIMARY KEY (id);


--
-- Name: alert_history_alert_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alert_history_alert_at_idx ON public.alert_history USING btree (alert_id, at DESC);


--
-- Name: alerts_entity_resolved_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alerts_entity_resolved_created_idx ON public.alerts USING btree (legal_entity_id, resolved_at, created_at DESC);


--
-- Name: alerts_one_open_rule_per_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX alerts_one_open_rule_per_entity_idx ON public.alerts USING btree (legal_entity_id, rule_code) WHERE (resolved_at IS NULL);


--
-- Name: alerts_severity_resolved_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alerts_severity_resolved_created_idx ON public.alerts USING btree (severity, resolved_at, created_at DESC);


--
-- Name: audit_logs_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_user_id, at DESC);


--
-- Name: audit_logs_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_target_idx ON public.audit_logs USING btree (target_type, target_id, at DESC);


--
-- Name: crops_ranch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crops_ranch_id_idx ON public.crops USING btree (ranch_id);


--
-- Name: financial_snapshots_entity_periodo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX financial_snapshots_entity_periodo_idx ON public.financial_snapshots USING btree (legal_entity_id, periodo DESC);


--
-- Name: financial_snapshots_source_job_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX financial_snapshots_source_job_idx ON public.financial_snapshots USING btree (source_job_id) WHERE (source_job_id IS NOT NULL);


--
-- Name: integration_events_job_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_events_job_occurred_idx ON public.integration_events USING btree (job_id, occurred_at DESC);


--
-- Name: integration_events_status_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_events_status_occurred_idx ON public.integration_events USING btree (status, occurred_at DESC);


--
-- Name: legal_entities_producer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX legal_entities_producer_id_idx ON public.legal_entities USING btree (producer_id);


--
-- Name: legal_entities_producer_rfc_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX legal_entities_producer_rfc_uq ON public.legal_entities USING btree (producer_id, upper(btrim(rfc)));


--
-- Name: monitoring_jobs_entity_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX monitoring_jobs_entity_created_idx ON public.monitoring_jobs USING btree (legal_entity_id, created_at DESC);


--
-- Name: monitoring_jobs_ready_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX monitoring_jobs_ready_idx ON public.monitoring_jobs USING btree (status, available_at) WHERE (status = ANY (ARRAY['PENDING'::text, 'RETRY'::text]));


--
-- Name: producers_grower_number_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX producers_grower_number_uq ON public.producers USING btree (btrim(numero_productor)) WHERE ((numero_productor IS NOT NULL) AND (btrim(numero_productor) <> ''::text));


--
-- Name: producers_rfc_normalized_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX producers_rfc_normalized_uq ON public.producers USING btree (upper(btrim(rfc))) WHERE (btrim(rfc) <> ''::text);


--
-- Name: producers_zona_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX producers_zona_status_idx ON public.producers USING btree (zona, status);


--
-- Name: ranches_producer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ranches_producer_id_idx ON public.ranches USING btree (producer_id);


--
-- Name: validation_tasks_entity_executed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX validation_tasks_entity_executed_idx ON public.validation_tasks USING btree (legal_entity_id, executed_at DESC);


--
-- Name: alert_history alert_history_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_history
    ADD CONSTRAINT alert_history_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE RESTRICT;


--
-- Name: alerts alerts_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entities(id) ON DELETE RESTRICT;


--
-- Name: app_users app_users_producer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.producers(id) ON DELETE RESTRICT;


--
-- Name: crops crops_ranch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crops
    ADD CONSTRAINT crops_ranch_id_fkey FOREIGN KEY (ranch_id) REFERENCES public.ranches(id) ON DELETE RESTRICT;


--
-- Name: financial_snapshots financial_snapshots_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_snapshots
    ADD CONSTRAINT financial_snapshots_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entities(id) ON DELETE RESTRICT;


--
-- Name: financial_snapshots financial_snapshots_source_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_snapshots
    ADD CONSTRAINT financial_snapshots_source_job_id_fkey FOREIGN KEY (source_job_id) REFERENCES public.monitoring_jobs(id) ON DELETE SET NULL;


--
-- Name: integration_events integration_events_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_events
    ADD CONSTRAINT integration_events_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.monitoring_jobs(id) ON DELETE SET NULL;


--
-- Name: integration_events integration_events_validation_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_events
    ADD CONSTRAINT integration_events_validation_task_id_fkey FOREIGN KEY (validation_task_id) REFERENCES public.validation_tasks(id) ON DELETE SET NULL;


--
-- Name: legal_entities legal_entities_producer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entities
    ADD CONSTRAINT legal_entities_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.producers(id) ON DELETE RESTRICT;


--
-- Name: monitoring_jobs monitoring_jobs_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_jobs
    ADD CONSTRAINT monitoring_jobs_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entities(id) ON DELETE RESTRICT;


--
-- Name: monitoring_jobs monitoring_jobs_validation_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_jobs
    ADD CONSTRAINT monitoring_jobs_validation_task_id_fkey FOREIGN KEY (validation_task_id) REFERENCES public.validation_tasks(id) ON DELETE RESTRICT;


--
-- Name: ranches ranches_producer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranches
    ADD CONSTRAINT ranches_producer_id_fkey FOREIGN KEY (producer_id) REFERENCES public.producers(id) ON DELETE RESTRICT;


--
-- Name: validation_tasks validation_tasks_legal_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_tasks
    ADD CONSTRAINT validation_tasks_legal_entity_id_fkey FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entities(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


