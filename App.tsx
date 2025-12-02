import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DailyAttendance } from './components/DailyAttendance';
import { MemberStats } from './components/MemberStats';
import { DataExport } from './components/DataExport';
import { VacationApproval } from './components/VacationApproval';
import { Edit3, Calendar } from 'lucide-react';

type View = 'dashboard' | 'daily' | 'members' | 'approval' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Manage date state globally so Dashboard and Daily view are synced
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard today={selectedDate} onDateChange={setSelectedDate} />;
      case 'daily':
        return (
          <DailyAttendance 
            currentDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
        );
      case 'members':
        return <MemberStats />;
      case 'approval':
        return <VacationApproval />;
      case 'settings':
        return <DataExport />;
      default:
        return <Dashboard today={selectedDate} onDateChange={setSelectedDate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Area */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0 z-10">
           <h2 className="text-lg font-semibold text-slate-700">
             {currentView === 'dashboard' && '대시보드'}
             {currentView === 'daily' && '일일 출석 체크'}
             {currentView === 'members' && '개인별 근태 현황'}
             {currentView === 'approval' && '전자결재 (휴가)'}
             {currentView === 'settings' && '데이터 관리'}
           </h2>
           <div className="text-sm text-slate-500 font-medium">
             <div className="relative inline-block group">
                 {/* Visual Layer */}
                 <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 px-3 py-1.5 rounded transition-colors group select-none border border-transparent hover:border-slate-200 pointer-events-none">
                     <span>기준일: <span className="text-slate-700 font-bold">{selectedDate}</span></span>
                     <span className="text-slate-400 font-normal">
                        ({new Date(selectedDate).toLocaleDateString('ko-KR', { weekday: 'long' })})
                     </span>
                     <Edit3 size={14} className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"/>
                 </div>
                 {/* Invisible Input Layer */}
                 <input 
                   type="date"
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
             </div>
           </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-8">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;