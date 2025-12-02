import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { DailyStats, AttendanceStatus } from '../types';
import { getDailyStats, getMembers, getRecordsByDate } from '../services/storageService';
import { Calendar, Users, Clock, AlertCircle, CheckSquare, X, Edit3 } from 'lucide-react';

interface DashboardProps {
  today: string;
  onDateChange: (date: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ today, onDateChange }) => {
  const stats = useMemo(() => getDailyStats(today), [today]);
  const [detailStatus, setDetailStatus] = useState<AttendanceStatus | null>(null);
  
  const pending = stats.total - (stats.present + stats.late + stats.absent + stats.excused);

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
              {pending > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                   <div className="bg-slate-200 p-2 rounded-full text-slate-600"><Users size={18}/></div>
                   <div>
                     <p className="font-medium text-slate-800">미처리 인원 {pending}명</p>
                     <p className="text-sm text-slate-500">아직 출석 체크가 되지 않은 인원이 있습니다. 상단 '미체크' 카드를 더블클릭하여 명단을 확인하세요.</p>
                   </div>
                </div>
              )}
              {stats.late > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-3">
                   <div className="bg-yellow-200 p-2 rounded-full text-yellow-700"><Clock size={18}/></div>
                   <div>
                     <p className="font-medium text-slate-800">지각 인원 {stats.late}명 발생</p>
                     <p className="text-sm text-slate-600">지각 사유를 확인하고 비고란에 기록하는 것을 권장합니다.</p>
                   </div>
                </div>
              )}
               {stats.absent === 0 && stats.late === 0 && pending === 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
                   <div className="bg-green-200 p-2 rounded-full text-green-700"><CheckSquare size={18}/></div>
                   <div>
                     <p className="font-medium text-slate-800">모두 출석 완료!</p>
                     <p className="text-sm text-slate-600">오늘의 근태 현황이 매우 양호합니다.</p>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailStatus && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={() => setDetailStatus(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg 
                            ${detailStatus === AttendanceStatus.PENDING ? 'bg-slate-200 text-slate-600' : ''}
                            ${detailStatus === AttendanceStatus.PRESENT ? 'bg-green-200 text-green-700' : ''}
                            ${detailStatus === AttendanceStatus.LATE ? 'bg-yellow-200 text-yellow-700' : ''}
                            ${detailStatus === AttendanceStatus.ABSENT ? 'bg-red-200 text-red-700' : ''}
                            ${detailStatus === AttendanceStatus.EXCUSED ? 'bg-purple-200 text-purple-700' : ''}
                        `}>
                            {detailStatus === AttendanceStatus.PENDING && <CheckSquare size={24}/>}
                            {detailStatus === AttendanceStatus.PRESENT && <Users size={24}/>}
                            {detailStatus === AttendanceStatus.LATE && <Clock size={24}/>}
                            {detailStatus === AttendanceStatus.ABSENT && <AlertCircle size={24}/>}
                            {detailStatus === AttendanceStatus.EXCUSED && <Calendar size={24}/>}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {detailStatus === AttendanceStatus.PENDING && '미체크'}
                                {detailStatus === AttendanceStatus.PRESENT && '출석'}
                                {detailStatus === AttendanceStatus.LATE && '지각'}
                                {detailStatus === AttendanceStatus.ABSENT && '결석'}
                                {detailStatus === AttendanceStatus.EXCUSED && '휴가/공가'} 
                                인원 목록
                            </h3>
                            <p className="text-sm text-slate-500">총 {detailMembers.length}명의 명단입니다.</p>
                        </div>
                    </div>
                    <button onClick={() => setDetailStatus(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} className="text-slate-500"/>
                    </button>
                </div>
                
                {/* Modal Body */}
                <div className="overflow-auto p-0 flex-1">
                    {detailMembers.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr className="border-b border-slate-100">
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">이름</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">부서/직급</th>
                                    {detailStatus !== AttendanceStatus.PENDING && detailStatus !== AttendanceStatus.ABSENT && (
                                       <th className="p-4 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">출퇴근 시간</th>
                                    )}
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">비고</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {detailMembers.map(member => {
                                    const record = getMemberRecord(member.id);
                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{member.name}</div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs mr-2 font-medium border border-slate-200">{member.team}</span>
                                                {member.position}
                                            </td>
                                            {detailStatus !== AttendanceStatus.PENDING && detailStatus !== AttendanceStatus.ABSENT && (
                                                <td className="p-4 text-sm font-mono text-slate-600">
                                                    {record?.checkInTime ? (
                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                                            {record.checkInTime}
                                                        </span>
                                                    ) : '-'}
                                                    <span className="mx-2 text-slate-300">~</span>
                                                    {record?.checkOutTime ? (
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                                            {record.checkOutTime}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            )}
                                            <td className="p-4 text-sm text-slate-500">
                                                {record?.note ? (
                                                     <span className="text-slate-700">{record.note}</span>
                                                ) : (
                                                     <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <div className="bg-slate-100 p-4 rounded-full mb-3">
                                <Users size={32} className="text-slate-300"/>
                            </div>
                            <p>해당하는 인원이 없습니다.</p>
                        </div>
                    )}
                </div>
                
                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end shrink-0">
                    <button onClick={() => setDetailStatus(null)} className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors text-slate-700">
                        닫기
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};