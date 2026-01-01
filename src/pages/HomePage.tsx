import { MyTasksCard } from '@/components/home/MyTasksCard';
import { AssignedCommentsCard } from '@/components/home/AssignedCommentsCard';
import { FeedCard } from '@/components/home/FeedCard';

const HomePage = () => {
  return (
    <div className="p-6 h-screen flex flex-col overflow-hidden">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold">Início</h1>
        <p className="text-muted-foreground">Suas tarefas, comentários e atualizações do workspace</p>
      </div>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        {/* Feed - ocupa 2 colunas em telas grandes */}
        <div className="lg:col-span-2 min-h-0 overflow-hidden">
          <FeedCard />
        </div>
        
        {/* Sidebar com Comentários e Tarefas */}
        <div className="flex flex-col gap-6 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <AssignedCommentsCard />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <MyTasksCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
