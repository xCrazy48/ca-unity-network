
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'inter';
UPDATE public.papers SET level = 'inter' WHERE code IN ('p1','p2','p3','p4','p5','p6');

INSERT INTO public.papers (code, name, paper_group, sort_order, level) VALUES
  ('f1', 'Financial Reporting', 'group_1', 11, 'final'),
  ('f2', 'Advanced Financial Management', 'group_1', 12, 'final'),
  ('f3', 'Advanced Auditing, Assurance and Professional Ethics', 'group_1', 13, 'final'),
  ('f4', 'Direct Tax Laws and International Taxation', 'group_2', 14, 'final'),
  ('f5', 'Indirect Tax Laws', 'group_2', 15, 'final'),
  ('f6', 'Integrated Business Solutions', 'group_2', 16, 'final')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, paper_group = EXCLUDED.paper_group, sort_order = EXCLUDED.sort_order, level = EXCLUDED.level;
