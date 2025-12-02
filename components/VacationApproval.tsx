
import React, { useState, useEffect } from 'react';
import { getMembers, getVacationRequests, saveVacationRequest, updateVacationStatus, getVacationBalances, saveVacationBalances, calculateBusinessDays } from '../services/storageService';
import { Member, VacationRequest, VacationStatus, VacationBalance } from '../types';
import { ClipboardCheck, FilePlus, Calendar, CheckCircle, XCircle, User, AlertCircle, ShieldCheck, PieChart, Save, Download } from 'lucide-react';

export const VacationApproval: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'request' | 'approval' | 'management'>('request');
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [balances, setBalances] = useState<VacationBalance[]>([]);
  
  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vacationType, setVacationType] = useState('연차');
  const [reason, setReason] = useState('');

  // Balance Management State
  const [editBalances, setEditBalances] = useState<VacationBalance[]>([]);

  useEffect(() => {
    const m = getMembers();
    setMembers(m);
    refreshData();
  }, []);

  const refreshData = () => {
    // Requests
    const reqs = getVacationRequests().sort((a, b) => b.requestDate.localeCompare(a.requestDate));
    setRequests(reqs);

    // Balances
    const bals = getVacationBalances();
    setBalances(bals);
    setEditBalances(JSON.parse(JSON.stringify(bals))); // Deep copy for editing
  };

  const getMemberName = (id: string) => {
      const m = members.find(mem => mem.id === id);
      return m ? `${m.name} (${m.team})` : 'Unknown';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !startDate || !endDate) return;

    if (startDate > endDate) {
        alert('종료일은 시작일보다 빠를 수 없습니다.');
        return;
    }

    // Check Balance if type is Annual Leave
    if (vacationType === '연차' || vacationType.includes('반차')) {
        const bal = balances.find(b => b.memberId === selectedMemberId);
        if (bal) {
            let required = 0;
            if (vacationType.includes('반차')) required = 0.5;
            else required = calculateBusinessDays(startDate, endDate);

            const remaining = bal.totalDays - bal.usedDays;
            if (required > remaining) {
                if(!window.confirm(`잔여 연차가 부족합니다.\n(필요: ${required}일 / 잔여: ${remaining}일)\n\n그래도 신청하시겠습니까? (마이너스 처리됨)`)) {
                    return;
                }
            }
        }
    }

    const newRequest: VacationRequest = {
      id: `vac-${Date.now()}`,
      memberId: selectedMemberId,
      startDate,
      endDate,
      type: vacationType,
      reason,
      status: VacationStatus.PENDING,
      requestDate: new Date().toISOString()
    };

    saveVacationRequest(newRequest);
    alert('휴가 신청이 완료되었습니다.\n[사무국장] 결재 대기열에 등록되었습니다.');
    refreshData();
    
    // Reset Form
    setStartDate('');
    setEndDate('');
    setReason('');
    setActiveTab('approval'); 
  };

  const handleStatusUpdate = (id: string, newStatus: VacationStatus, req: VacationRequest) => {
    let confirmMsg = '';
    let successMsg = '';

    if (newStatus === VacationStatus.SECRETARY_APPROVED) {
        confirmMsg = `[사무국장 승인]을 진행하시겠습니까?\n다음 단계인 [원장 승인] 대기 상태로 변경됩니다.`;
        successMsg = `사무국장 승인이 완료되었습니다.\n원장 결재 대기 상태로 넘어갑니다.`;
    } else if (newStatus === VacationStatus.FINAL_APPROVED) {
        confirmMsg = `[원장 최종 승인]을 진행하시겠습니까?\n\n1. 출석부에 '휴가' 상태가 자동 반영됩니다.\n2. 해당 직원의 연차가 자동 차감됩니다.`;
        successMsg = `최종 승인 처리되었습니다. (연차 차감 완료)`;
    } else if (newStatus === VacationStatus.REJECTED) {
        confirmMsg = `정말 반려 하시겠습니까?`;
        successMsg = `반려 처리되었습니다.`;
    }
    
    if(window.confirm(confirmMsg)) {
       updateVacationStatus(id, newStatus);
       refreshData();
       alert(successMsg);
    }
  };

  // Management Tab Handlers
  const handleBalanceChange = (memberId: string, val: string) => {
      const num = parseFloat(val);
      if (isNaN(num)) return;
      
      setEditBalances(prev => prev.map(b => 
          b.memberId === memberId ? { ...b, totalDays: num } : b
      ));
  };

  const saveBalanceChanges = () => {
      if(window.confirm('변경된 총 연차 정보를 저장하시겠습니까?')) {
          saveVacationBalances(editBalances);
          refreshData();
          alert('연차 정보가 저장되었습니다.');
      }
  };

  const downloadBalanceCSV = () => {
      let csv = "\uFEFF이름,부서,총연차,사용연차,잔여연차\n";
      editBalances.forEach(b => {
          const m = members.find(mem => mem.id === b.memberId);
          if(m) {
              csv += `${m.name},${m.team},${b.totalDays},${b.usedDays},${b.totalDays - b.usedDays}\n`;
          }
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `연차현황_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const pendingCount = requests.filter(r => r.status !== VacationStatus.FINAL_APPROVED && r.status !== VacationStatus.REJECTED).length;

  const getSelectedMemberBalance = () => {
      if(!selectedMemberId) return null;
      const bal = balances.find(b => b.memberId === selectedMemberId);
      if(!bal) return null;
      return bal;
  };

  const selectedBalance = getSelectedMemberBalance();

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={28}/>
            전자결재 (휴가 관리)
          </h2>
          <p className="text-slate-500">휴가 신청 및 연차 현황을 관리하는 전자결재 시스템입니다.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-lg border border-slate-200">
           <button 
             onClick={() => setActiveTab('request')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === 'request' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
             }`}
           >
             <div className="flex items-center gap-2">
               <FilePlus size={16}/> 휴가 신청서
             </div>
           </button>
           <button 
             onClick={() => setActiveTab('approval')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === 'approval' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
             }`}
           >
             <div className="flex items-center gap-2">
               <CheckCircle size={16}/> 결재 대기열
               {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">{pendingCount}</span>}
             </div>
           </button>
           <button 
             onClick={() => setActiveTab('management')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === 'management' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
             }`}
           >
             <div className="flex items-center gap-2">
               <PieChart size={16}/> 연차 관리
             </div>
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'request' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100 p-8 overflow-y-auto max-h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4 flex items-center gap-2">
                <FilePlus size={20} className="text-slate-500"/> 휴가 신청서 작성
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">신청자 (직원 선택)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <select 
                    required
                    className="w-full pl-10 pr-4 py-3 border border-blue-200 bg-blue-50 text-blue-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none transition-colors placeholder-blue-400"
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                  >
                    <option value="">직원을 선택해주세요</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.team} {m.position})</option>
                    ))}
                  </select>
                </div>
                {selectedBalance && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="text-slate-500">잔여 연차:</span>
                        <span className={`font-bold ${selectedBalance.totalDays - selectedBalance.usedDays < 3 ? 'text-red-600' : 'text-blue-600'}`}>
                            {selectedBalance.totalDays - selectedBalance.usedDays}일
                        </span>
                        <span className="text-slate-400 text-xs">
                            (총 {selectedBalance.totalDays}일 중 {selectedBalance.usedDays}일 사용)
                        </span>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700">시작일</label>
                   <div className="relative group">
                       <div className="w-full px-4 py-3 border border-blue-200 bg-blue-50 text-blue-900 rounded-lg flex items-center justify-between pointer-events-none">
                            <span>{startDate || 'YYYY-MM-DD'}</span>
                            <Calendar size={20} className="text-blue-500"/>
                       </div>
                       <input 
                         type="date" 
                         required
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                         value={startDate}
                         onChange={e => setStartDate(e.target.value)}
                       />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700">종료일</label>
                   <div className="relative group">
                       <div className="w-full px-4 py-3 border border-blue-200 bg-blue-50 text-blue-900 rounded-lg flex items-center justify-between pointer-events-none">
                            <span>{endDate || 'YYYY-MM-DD'}</span>
                            <Calendar size={20} className="text-blue-500"/>
                       </div>
                       <input 
                         type="date" 
                         required
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                         value={endDate}
                         min={startDate}
                         onChange={e => setEndDate(e.target.value)}
                       />
                   </div>
                 </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">휴가 종류</label>
                <div className="flex gap-4 flex-wrap">
                  {['연차', '반차(오전)', '반차(오후)', '공가', '병가'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                      <input 
                        type="radio" 
                        name="vacationType" 
                        value={type}
                        checked={vacationType === type}
                        onChange={e => setVacationType(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">사유</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="휴가 사유를 입력하세요"
                  className="w-full px-4 py-3 border border-blue-200 bg-blue-50 text-blue-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none placeholder-blue-400 transition-colors"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                  <FilePlus size={20}/> 신청서 제출하기
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'approval' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
             <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800 flex items-center gap-2">
                <AlertCircle size={18}/>
                <span><strong>[사무국장]</strong> 승인 후 <strong>[원장]</strong> 최종 승인 시 연차가 차감됩니다.</span>
             </div>
             <div className="overflow-auto flex-1">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 sticky top-0">
                   <tr>
                     <th className="p-4 text-xs font-semibold text-slate-500 uppercase">신청일</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 uppercase">신청자</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 uppercase">기간/종류</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 uppercase">사유</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">진행 상태</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">결재 관리</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {requests.length === 0 ? (
                     <tr><td colSpan={6} className="p-12 text-center text-slate-400">신청 내역이 없습니다.</td></tr>
                   ) : requests.map(req => {
                     const member = members.find(m => m.id === req.memberId);
                     return (
                       <tr key={req.id} className="hover:bg-slate-50">
                         <td className="p-4 text-sm text-slate-500">{new Date(req.requestDate).toLocaleDateString()}</td>
                         <td className="p-4">
                           <div className="font-medium text-slate-800">{member?.name || '알 수 없음'}</div>
                           <div className="text-xs text-slate-500">{member?.team} {member?.position}</div>
                         </td>
                         <td className="p-4">
                           <div className="font-bold text-slate-700">{req.startDate} ~ {req.endDate}</div>
                           <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs mt-1 border border-blue-100">{req.type}</span>
                         </td>
                         <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                         <td className="p-4 text-center">
                           <span className={`px-2 py-1 rounded text-xs font-bold border
                             ${req.status === VacationStatus.PENDING ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                             ${req.status === VacationStatus.SECRETARY_APPROVED ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                             ${req.status === VacationStatus.FINAL_APPROVED ? 'bg-green-100 text-green-700 border-green-200' : ''}
                             ${req.status === VacationStatus.REJECTED ? 'bg-red-100 text-red-700 border-red-200' : ''}
                           `}>
                             {req.status}
                           </span>
                         </td>
                         <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                               {req.status === VacationStatus.PENDING && (
                                   <>
                                     <button 
                                        onClick={() => handleStatusUpdate(req.id, VacationStatus.SECRETARY_APPROVED, req)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm text-xs font-bold" 
                                        title="사무국장 승인">
                                        <ShieldCheck size={14}/> 사무국장 승인
                                     </button>
                                     <button 
                                        onClick={() => handleStatusUpdate(req.id, VacationStatus.REJECTED, req)}
                                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-sm" 
                                        title="반려">
                                        <XCircle size={16}/>
                                     </button>
                                   </>
                               )}

                               {req.status === VacationStatus.SECRETARY_APPROVED && (
                                   <>
                                     <button 
                                        onClick={() => handleStatusUpdate(req.id, VacationStatus.FINAL_APPROVED, req)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors shadow-sm text-xs font-bold" 
                                        title="원장 승인 (최종)">
                                        <CheckCircle size={14}/> 원장 승인
                                     </button>
                                     <button 
                                        onClick={() => handleStatusUpdate(req.id, VacationStatus.REJECTED, req)}
                                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-sm" 
                                        title="반려">
                                        <XCircle size={16}/>
                                     </button>
                                   </>
                               )}

                               {(req.status === VacationStatus.FINAL_APPROVED || req.status === VacationStatus.REJECTED) && (
                                   <span className="text-xs text-slate-400 font-medium px-2">처리 완료</span>
                               )}
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'management' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <PieChart size={20} className="text-blue-500"/> 개인별 연차 현황
                      </h3>
                      <p className="text-sm text-slate-500">총 연차 일수를 수정하거나 사용 현황을 엑셀로 받을 수 있습니다.</p>
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={downloadBalanceCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-bold border border-green-200"
                      >
                          <Download size={16}/> 엑셀 다운로드
                      </button>
                      <button 
                        onClick={saveBalanceChanges}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
                      >
                          <Save size={16}/> 변경사항 저장
                      </button>
                  </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                          <tr>
                              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">이름</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">부서</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 uppercase w-32">총 연차 (수정)</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 uppercase w-32">사용 연차</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 uppercase w-32">잔여 연차</th>
                              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">소진율</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {editBalances.map(bal => {
                              const member = members.find(m => m.id === bal.memberId);
                              if (!member) return null;
                              
                              const remaining = bal.totalDays - bal.usedDays;
                              const usagePercent = bal.totalDays > 0 ? (bal.usedDays / bal.totalDays) * 100 : 0;
                              
                              return (
                                  <tr key={bal.memberId} className="hover:bg-slate-50">
                                      <td className="p-4 font-bold text-slate-700">{member.name}</td>
                                      <td className="p-4 text-slate-500 text-sm">{member.team}</td>
                                      <td className="p-4">
                                          <input 
                                            type="number" 
                                            value={bal.totalDays}
                                            onChange={(e) => handleBalanceChange(bal.memberId, e.target.value)}
                                            className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right font-bold text-slate-700 bg-white"
                                          />
                                      </td>
                                      <td className="p-4 text-slate-600 text-right pr-8">{bal.usedDays}</td>
                                      <td className="p-4 text-right pr-8">
                                          <span className={`font-bold ${remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                              {remaining}
                                          </span>
                                      </td>
                                      <td className="p-4">
                                          <div className="flex items-center gap-2">
                                              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                  <div 
                                                    className={`h-full rounded-full ${usagePercent > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                                  ></div>
                                              </div>
                                              <span className="text-xs text-slate-400">{usagePercent.toFixed(0)}%</span>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
