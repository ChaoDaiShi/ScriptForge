import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Workbench from '@/features/workbench/Workbench'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/workbench" replace />} />
        <Route path="workbench" element={<Workbench />} />
        <Route path="tasks" element={<div className="p-8 text-foreground">任务中心 (开发中)</div>} />
        <Route path="assets" element={<div className="p-8 text-foreground">剧本库 (开发中)</div>} />
        <Route path="*" element={<div className="p-8 text-foreground">404 Not Found</div>} />
      </Route>
    </Routes>
  )
}

export default App
