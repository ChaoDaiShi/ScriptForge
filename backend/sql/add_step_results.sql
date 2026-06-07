-- 添加 step_results 字段到 tasks 表
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS step_results jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 添加注释
COMMENT ON COLUMN public.tasks.step_results IS '存储每个步骤的处理结果';