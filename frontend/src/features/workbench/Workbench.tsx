import { Group, Panel, Separator } from "react-resizable-panels";

export default function Workbench() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <Group orientation="horizontal">
        <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-card">
          <div className="p-4 h-full overflow-auto">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Context & Outline
            </h2>
            <div className="text-sm">左侧内容：大纲与原著对比</div>
          </div>
        </Panel>

        <Separator className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors" />

        <Panel defaultSize={55} minSize={40}>
          <div className="p-4 h-full overflow-auto bg-background">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Visual Editor
            </h2>
            <div className="text-sm">中央内容：集、场景卡片</div>
          </div>
        </Panel>

        <Separator className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors" />

        <Panel defaultSize={25} minSize={20} maxSize={40} className="bg-card">
          <div className="p-4 h-full overflow-auto">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Inspector
            </h2>
            <div className="text-sm">右侧内容：AI 与 YAML 源码</div>
          </div>
        </Panel>
      </Group>
    </div>
  );
}
