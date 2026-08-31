import { MyTasksCard } from '@/components/home/MyTasksCard';
import { AssignedCommentsCard } from '@/components/home/AssignedCommentsCard';
import { FeedCard } from '@/components/home/FeedCard';

const HomePage = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-3 md:overflow-hidden md:p-4">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold">Início</h1>
        <p className="text-sm text-muted-foreground">Suas tarefas, comentários e atualizações</p>
      </div>

      {/* Mobile: coluna única com rolagem da página. Desktop: grid + feed. */}
      <div className="flex flex-1 flex-col gap-4 md:min-h-0 md:overflow-hidden">
        <div className="grid grid-cols-1 gap-4 md:min-h-0 lg:grid-cols-2 md:[flex:0_0_40%]">
          <div className="min-h-[320px] md:min-h-0 md:overflow-hidden">
            <MyTasksCard />
          </div>
          <div className="min-h-[320px] md:min-h-0 md:overflow-hidden">
            <AssignedCommentsCard />
          </div>
        </div>

        <div className="min-h-[420px] md:min-h-0 md:flex-1 md:overflow-hidden">
          <FeedCard />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
