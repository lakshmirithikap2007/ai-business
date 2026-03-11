import { DataProvider } from "@/contexts/DataContext";
import { AppShell } from "@/components/AppShell";

const Index = () => {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
};

export default Index;
