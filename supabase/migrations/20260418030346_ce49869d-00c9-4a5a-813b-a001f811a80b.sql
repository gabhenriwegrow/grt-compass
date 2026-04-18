-- Create monthly_mrr table
CREATE TABLE public.monthly_mrr (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  realized_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE public.monthly_mrr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read monthly_mrr" ON public.monthly_mrr FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write monthly_mrr" ON public.monthly_mrr FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update monthly_mrr" ON public.monthly_mrr FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete monthly_mrr" ON public.monthly_mrr FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_monthly_mrr_updated_at
  BEFORE UPDATE ON public.monthly_mrr
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 12 months for 2026
INSERT INTO public.monthly_mrr (month, year, realized_value)
SELECT m, 2026, 0 FROM generate_series(1, 12) AS m;

-- Update Key Results
UPDATE public.key_results SET title = 'Gerar pipeline qualificado e acelerar novas oportunidades', owner = 'Gabriel' WHERE code = 'COM-01';
UPDATE public.key_results SET title = 'Elevar a qualidade e conversão das reuniões comerciais', owner = 'Gabriel' WHERE code = 'COM-02';
UPDATE public.key_results SET title = 'Consolidar processos e disciplina operacional do time', owner = 'Isabela' WHERE code = 'COM-03';