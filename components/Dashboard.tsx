
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { AttendanceStatus, VacationStatus } from '../types';
import { getDailyStats, getMembers, getRecordsByDate, getVacationRequests } from '../services/storageService';
import { Calendar, Users, Clock, AlertCircle, CheckSquare, X, Edit3, ClipboardCheck, ArrowRight } from 'lucide-react';

interface DashboardProps {
  today: string;
  onDateChange: (date: string) => void;
  onNavigateToApproval?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ today, onDateChange, onNavigateToApproval }) => {
  const stats = useMemo(() => getDailyStats(today), [today]);
  const [detailStatus, setDetailStatus] = useState<AttendanceStatus | null>(null);
  
  const pending = stats.total - (stats.present + stats.late + stats.absent + stats.excused);

  // Vacation Requests Count (Pending or Secretary Approved)
  const vacationRequests = getVacationRequests();
  const pendingVacationCount = vacationRequests.filter(
      r => r.status === VacationStatus.PENDING || r.status === VacationStatus.SECRETARY_APPROVED
  ).length;

  const data = [
    { name: '출석', value: stats.present, color: '#22c55e' }, // green-500
    { name: '지각', value: stats.late, color: '#eab308' },    // yellow-500
    { name: '결석', value: stats.absent, color: '#ef4444' },  // red-500
    { name: '휴가', value: stats.excused, color: '#a855f7' }, // purple-500
    { name: '미체크', value: pending, color: '#cbd5e1' },     // slate-300
  ].filter(d => d.value > 0);

  // Helper to get detail list
  const getDetailMembers = () => {
      if (!detailStatus) return [];
      const members = getMembers();
      const records = getRecordsByDate(today);

      if (detailStatus === AttendanceStatus.PENDING) {
          return members.filter(m => !records.some(r => r.memberId === m.id));
      }
      return members.filter(m => {
          const record = records.find(r => r.memberId === m.id);
          return record?.status === detailStatus;
      });
  };

  const detailMembers = getDetailMembers();

  const getMemberRecord = (memberId: string) => {
      return getRecordsByDate(today).find(r => r.memberId === memberId);
  }

  const StatCard = ({ title, value, total, icon: Icon, colorClass, bgClass, statusTarget }: any) => (
    <div 
      onDoubleClick={() => setDetailStatus(statusTarget)}
      className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between cursor-pointer hover:shadow-md hover:bg-slate-50 transition-all select-none group relative"
      title="더블클릭하여 명단 확인"
    >
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1 group-hover:text-blue-600 transition-colors">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">
          {value}
          <span className="text-sm font-normal text-slate-400 ml-1">/ {total}</span>
        </h3>
      </div>
      <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 bg-white border px-1 rounded">
        더블클릭
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <div>
           {/* Invisible Overlay Date Picker */}
           <div className="relative inline-flex items-center gap-2 group cursor-pointer w-fit">
               <div className="text-2xl font-bold text-slate-800 flex items-center gap-2 select-none group-hover:text-blue-700 transition-colors pointer-events-none">
                   <Calendar size={24} className="text-blue-600"/>
                   {today} 현황
                   <Edit3 size={18} className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"/>
               </div>
               <input 
                   type="date"
                   value={today}
                   onChange={(e) => onDateChange(e.target.value)}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
           </div>
           <p className="text-slate-500">선택된 날짜의 근태 리포트입니다.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Clock size={16}/> 업데이트: 실시간
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="출석 완료" 
          value={stats.present} 
          total={stats.total} 
          icon={Users} 
          colorClass="text-green-600" 
          bgClass="bg-green-100" 
          statusTarget={AttendanceStatus.PRESENT}
        />
        <StatCard 
          title="지각" 
          value={stats.late} 
          total={stats.total} 
          icon={Clock} 
          colorClass="text-yellow-600" 
          bgClass="bg-yellow-100" 
          statusTarget={AttendanceStatus.LATE}
        />
        <StatCard 
          title="결석" 
          value={stats.absent} 
          total={stats.total} 
          icon={AlertCircle} 
          colorClass="text-red-600" 
          bgClass="bg-red-100" 
          statusTarget={AttendanceStatus.ABSENT}
        />
        <StatCard 
          title="휴가/공가" 
          value={stats.excused} 
          total={stats.total} 
          icon={Calendar} 
          colorClass="text-purple-600" 
          bgClass="bg-purple-100" 
          statusTarget={AttendanceStatus.EXCUSED}
        />
         <StatCard 
          title="미체크" 
          value={pending} 
          total={stats.total} 
          icon={CheckSquare} 
          colorClass="text-slate-600" 
          bgClass="bg-slate-100" 
          statusTarget={AttendanceStatus.PENDING}
        />
      </div>

      {/* Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-4">근태 비율</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ReTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-sm text-slate-500 mt-2">
            전체 {stats.total}명 중 {stats.total - pending}명 체크 완료
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
           <h3 className="text-lg font-bold text-slate-800 mb-4">관리자 알림</h3>
           <div className="space-y-4">
              {/* Vacation Alert */}
              {pendingVacationCount > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 flex items-start gap-3 animate-pulse-slow">
                     <div className="bg-purple-200 p-2 rounded-full text-purple-700">
                        <ClipboardCheck size={20}/>
                     </div>
                     <div className="flex-1">
                         <h4 className="font-bold text-slate-800">결재 대기 중인 휴가 신청서</h4>
                         <p className="text-sm text-slate-600">현재 <span className="font-bold text-purple-600">{pendingVacationCount}건</span>의 휴가 신청이 결재를 기다리고 있습니다.</p>
                     </div>
                     <button 
                       onClick={onNavigateToApproval}
                       className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                     >
                         결재하러 가기 <ArrowRight size={16}/>
                     </button>
                  </div>
              )}
              {pendingVacationCount === 0 && (
                   <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                       <CheckSquare size={32} className="mx-auto mb-2 opacity-50"/>
                       <p>확인할 새로운 알림이 없습니다.</p>
                   </div>
              )}
           </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailStatus(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {detailStatus} 인원 상세 ({detailMembers.length}명)
              </h3>
              <button onClick={() => setDetailStatus(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500"/>
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {detailMembers.length === 0 ? (
                <p className="text-center text-slate-400 py-8">해당하는 인원이 없습니다.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="p-3 rounded-l-lg">이름</th>
                      <th className="p-3">부서/직급</th>
                      <th className="p-3">상태</th>
                      <th className="p-3">출/퇴근</th>
                      <th className="p-3 rounded-r-lg">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailMembers.map(member => {
                      const record = getMemberRecord(member.id);
                      return (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{member.name}</td>
                          <td className="p-3 text-sm text-slate-500">{member.team} {member.position}</td>
                          <td className="p-3">
                             <span className={`px-2 py-1 rounded text-xs font-bold
                               ${detailStatus === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : ''}
                               ${detailStatus === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : ''}
                               ${detailStatus === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : ''}
                               ${detailStatus === AttendanceStatus.EXCUSED ? 'bg-purple-100 text-purple-700' : ''}
                               ${detailStatus === AttendanceStatus.PENDING ? 'bg-slate-100 text-slate-500' : ''}
                             `}>
                               {detailStatus}
                             </span>
                          </td>
                          <td className="p-3 text-xs text-slate-600 font-mono">
                             {record?.checkInTime || '--:--'} ~ {record?.checkOutTime || '--:--'}
                          </td>
                          <td className="p-3 text-sm text-slate-500">{record?.note || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
               <button onClick={() => setDetailStatus(null)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};