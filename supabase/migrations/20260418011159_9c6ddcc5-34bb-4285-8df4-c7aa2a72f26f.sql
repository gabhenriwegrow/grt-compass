
-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- objectives
CREATE TABLE public.objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement TEXT NOT NULL,
  target_annual NUMERIC NOT NULL DEFAULT 0,
  target_monthly NUMERIC NOT NULL DEFAULT 0,
  timeframe TEXT NOT NULL,
  health TEXT NOT NULL DEFAULT 'on_track' CHECK (health IN ('on_track','at_risk','off_track','achieved')),
  confidence INTEGER NOT NULL DEFAULT 70 CHECK (confidence BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read objectives" ON public.objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write objectives" ON public.objectives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update objectives" ON public.objectives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete objectives" ON public.objectives FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_objectives_updated BEFORE UPDATE ON public.objectives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- key_results
CREATE TABLE public.key_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('number','percentage','currency','boolean')),
  baseline NUMERIC NOT NULL DEFAULT 0,
  target NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  health TEXT NOT NULL DEFAULT 'on_track' CHECK (health IN ('on_track','at_risk','off_track','achieved')),
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read key_results" ON public.key_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write key_results" ON public.key_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update key_results" ON public.key_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete key_results" ON public.key_results FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_key_results_updated BEFORE UPDATE ON public.key_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_key_results_objective ON public.key_results(objective_id);

-- initiatives
CREATE TABLE public.initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_result_id UUID REFERENCES public.key_results(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'nao_iniciado' CHECK (status IN ('concluido','em_andamento','bloqueado','nao_iniciado','pausado')),
  effort INTEGER CHECK (effort BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  priority_score INTEGER,
  indicator TEXT,
  indicator_type TEXT CHECK (indicator_type IN ('Projeto','Processo')),
  target_value NUMERIC,
  current_value NUMERIC,
  target_percentage NUMERIC,
  due_date DATE,
  impediment TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read initiatives" ON public.initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write initiatives" ON public.initiatives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update initiatives" ON public.initiatives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete initiatives" ON public.initiatives FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_initiatives_updated BEFORE UPDATE ON public.initiatives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_initiatives_kr ON public.initiatives(key_result_id);
CREATE INDEX idx_initiatives_category ON public.initiatives(category);
CREATE INDEX idx_initiatives_status ON public.initiatives(status);

-- weekly_checkins
CREATE TABLE public.weekly_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id UUID NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  week_date DATE NOT NULL,
  status_snapshot TEXT NOT NULL,
  progress_delta TEXT,
  blockers TEXT,
  next_steps TEXT,
  notes TEXT,
  author TEXT NOT NULL DEFAULT 'Gabriel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read checkins" ON public.weekly_checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write checkins" ON public.weekly_checkins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update checkins" ON public.weekly_checkins FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete checkins" ON public.weekly_checkins FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_checkins_initiative ON public.weekly_checkins(initiative_id);
CREATE INDEX idx_checkins_week ON public.weekly_checkins(week_date DESC);

-- ai_reports (table for future use)
CREATE TABLE public.ai_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly_summary','risk_alert','executive_brief')),
  scope TEXT NOT NULL,
  content TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_date DATE
);
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read reports" ON public.ai_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write reports" ON public.ai_reports FOR INSERT TO authenticated WITH CHECK (true);

-- Seed objective + 3 KRs
DO $$
DECLARE obj_id UUID;
BEGIN
  INSERT INTO public.objectives (statement, target_annual, target_monthly, timeframe, health, confidence)
  VALUES ('Fechar 2026 com R$1.260.000 em novo MRR', 1260000, 105000, '2026', 'on_track', 70)
  RETURNING id INTO obj_id;

  INSERT INTO public.key_results (objective_id, code, title, metric_type, baseline, target, current_value, unit, owner) VALUES
  (obj_id, 'COM-01', 'Atingir R$105.000 de novo MRR mensal', 'currency', 0, 105000, 0, 'BRL', 'Gabriel'),
  (obj_id, 'COM-02', 'Gerar 60 SQLs qualificados por mês', 'number', 0, 60, 0, 'leads', 'Gabriel'),
  (obj_id, 'COM-03', 'Manter taxa de conversão SQL→Cliente em 25%', 'percentage', 0, 25, 0, '%', 'Gabriel');
END $$;
