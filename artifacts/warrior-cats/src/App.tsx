import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import FamilyTreeCanvas from './components/FamilyTreeCanvas';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FamilyTreeCanvas />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
