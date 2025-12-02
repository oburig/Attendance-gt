
import React, { useState, useMemo } from 'react';
import { getMembers, getRecords } from '../services/storageService';
import { AttendanceStatus } from '../types';
import { Search, User, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const MemberStats: React.FC = () => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const members = getMembers();
  const allRecords = getRecords();

  const filteredMembers = members.filter(m => 
    m.name.includes(searchTerm) || m.team.includes(searchTerm)
  );

  const selectedMember = members.find(m => m.id === selectedMemberId);

  // Calculate stats for selected member
  const memberStats = useMemo(() => {
    if (!selectedMemberId) return null;
    const records = allRecords.filter(r => r.memberId === selectedMemberId);
    
    const counts = {
      [AttendanceStatus.PRESENT]: 0,
      [AttendanceStatus.LATE]: 0,
      [AttendanceStatus.ABSENT]: 0,
      [AttendanceStatus.EXCUSED]: 0,
    };

    records.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });

    return {
        records: records.sort((a, b) => b.date.localeCompare(a.date)), // Newest first
        chartData: [
            { name: '출석', value: counts[AttendanceStatus.PRESENT], color: '#22c55e' },
            { name: '지각', value: counts[AttendanceStatus.LATE], color: '#eab308' },
            { name: '결석', value: counts[AttendanceStatus.ABSENT], color: '#ef4444' },
            { name: '휴가', value: counts[AttendanceStatus.EXCUSED], color: '#a855f7' },
        ]
    };
  }, [selectedMemberId, allRecords]);

  return (
    <div className="h-full flex gap-6">
      {/* List Sidebar */}
      <div className="w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="직원 검색..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
           {filteredMembers.map(member => (
             <button
               key={member.id}
               onClick={() => setSelectedMemberId(member.id)}
               className={`w-full text-left p-4 flex items-center gap-3 border-b border-slate-50 transition-colors
                 ${selectedMemberId === member.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50'}
               `}
             >
               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                 {member.name[0]}
               </div>
               <div>
                 <div className="flex items-center gap-1">
                     <p className={`text-sm font-medium ${selectedMemberId === member.id ? 'text-blue-700' : 'text-slate-800'}`}>{member.name}</p>
                     {member.workLocation && <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{member.workLocation}</span>}
                 </div>
                 <p className="text-xs text-slate-500">{member.team} {member.position}</p>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
         {selectedMember && memberStats ? (
           <div className="h-full flex flex-col">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                     {selectedMember.name[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {selectedMember.name} 
                        <div className="flex gap-1">
                            {selectedMember.workLocation && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border 
                                    ${selectedMember.workLocation === '시설' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}
                                `}>
                                    {selectedMember.workLocation}
                                </span>
                            )}
                            {selectedMember.workPlace && (
                                <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
                                    {selectedMember.workPlace}
                                </span>
                            )}
                        </div>
                    </h2>
                    <p className="text-slate-500">{selectedMember.team} / {selectedMember.position}</p>
                  </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-400">총 기록일수</p>
                    <p className="text-xl font-bold text-slate-800">{memberStats.records.length}일</p>
                </div>
             </div>

             <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-y-auto">
                {/* Chart */}
                <div>
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <BarChart2 size={20} className="text-blue-500"/> 근태 요약
                   </h3>
                   <div className="h-64 border border-slate-100 rounded-lg p-4 bg-slate-50">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={memberStats.chartData}>
                          <XAxis dataKey="name" tick={{fontSize: 12}} />
                          <YAxis allowDecimals={false}/>
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {memberStats.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* History List */}
                <div>
                   <h3 className="text-lg font-bold text-slate-800 mb-4">최근 기록</h3>
                   <div className="space-y-3">
                     {memberStats.records.length === 0 ? (
                       <p className="text-slate-400 text-sm">기록이 없습니다.</p>
                     ) : (
                       memberStats.records.map((r) => (
                         <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                            <div>
                               <p className="text-sm font-bold text-slate-700">{r.date}</p>
                               {r.note && <p className="text-xs text-slate-400 mt-1">"{r.note}"</p>}
                            </div>
                            <div className="text-right">
                               <span className={`px-2 py-1 rounded text-xs font-bold
                                 ${r.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' : ''}
                                 ${r.status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : ''}
                                 ${r.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : ''}
                                 ${r.status === AttendanceStatus.EXCUSED ? 'bg-purple-100 text-purple-700' : ''}
                               `}>{r.status}</span>
                               <p className="text-xs text-slate-500 mt-1">{r.checkInTime || '-'}</p>
                            </div>
                         </div>
                       ))
                     )}
                   </div>
                </div>
             </div>
           </div>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <User size={64} className="mb-4 text-slate-200" />
              <p>왼쪽 목록에서 직원을 선택하여 상세 정보를 확인하세요.</p>
           </div>
         )}
      </div>
    </div>
  );
};