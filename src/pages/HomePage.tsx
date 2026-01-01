import { MyTasksCard } from '@/components/home/MyTasksCard';
import { AssignedCommentsCard } from '@/components/home/AssignedCommentsCard';

const HomePage = () => {
  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Início</h1>
        <p className="text-muted-foreground">Suas tarefas e comentários atribuídos</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <AssignedCommentsCard />
        <MyTasksCard />
      </div>
    </div>
  );
};

export default HomePage;
