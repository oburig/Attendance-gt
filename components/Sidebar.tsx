import React from 'react';
import { LayoutDashboard, CheckSquare, Users, Settings, ClipboardCheck } from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'daily' | 'members' | 'approval' | 'settings';
  onChangeView: (view: 'dashboard' | 'daily' | 'members' | 'approval' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'daily', label: '오늘의 출석', icon: CheckSquare },
    { id: 'members', label: '개인별 현황', icon: Users },
    { id: 'approval', label: '전자결재 (휴가)', icon: ClipboardCheck },
    { id: 'settings', label: '데이터 관리', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl z-20">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-blue-400">근태관리</span>(정심작업장)
        </h1>
        <p className="text-xs text-slate-400 mt-1">Attendance Pro v1.1</p>
      </div>

      <nav className="flex-1 py-6 space-y-2 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
             HR
           </div>
           <div className="flex-1">
             <p className="text-sm font-medium text-white">인사담당자</p>
             <p className="text-xs">관리자 모드</p>
           </div>
        </div>
      </div>
    </aside>
  );
};