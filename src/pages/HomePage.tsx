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
      
      <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-hidden">
        {/* Linha superior: Tarefas e Comentários lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0" style={{ flex: '0 0 45%' }}>
          <div className="min-h-0 overflow-hidden">
            <MyTasksCard />
          </div>
          <div className="min-h-0 overflow-hidden">
            <AssignedCommentsCard />
          </div>
        </div>
        
        {/* Feed abaixo, ocupando o resto do espaço */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <FeedCard />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
