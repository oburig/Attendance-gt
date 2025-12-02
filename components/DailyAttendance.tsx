
import React, { useState, useEffect } from 'react';
import { Member, AttendanceRecord, AttendanceStatus } from '../types';
import { getMembers, getRecordsByDate, saveRecord, sendToGoogleSheet, getSheetUrl } from '../services/storageService';
import { Search, CheckCircle, XCircle, Clock, Calendar, Filter, CheckSquare, Square, LogOut, CalendarDays, MapPin, Building, Lock, CloudUpload, Loader2 } from 'lucide-react';

interface DailyAttendanceProps {
  currentDate: string;
  onDateChange: (date: string) => void;
}

export const DailyAttendance: React.FC<DailyAttendanceProps> = ({ currentDate, onDateChange }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filterTeam, setFilterTeam] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All'); // Facility/Home
  const [filterPlace, setFilterPlace] = useState<string>('All'); // 1F/2F
  const [searchTerm, setSearchTerm] = useState('');
  
  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchCheckIn, setBatchCheckIn] = useState('09:30'); 
  const [batchCheckOut, setBatchCheckOut] = useState('16:30');

  // Manual Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Reload data
  const loadData = () => {
    const m = getMembers();
    const r = getRecordsByDate(currentDate);
    setMembers(m);
    setRecords(r);
  };

  useEffect(() => {
    loadData();
    setSelectedIds(new Set()); // Reset selection on date change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const handleManualSync = async () => {
      // 1. URL Check
      const url = getSheetUrl();
      if (!url) {
          alert("구글 시트 URL이 설정되지 않았습니다.\n'데이터 관리' 메뉴에서 URL을 먼저 저장해주세요.");
          return;
      }

      // 2. Data Check
      if (members.length === 0) {
          alert("전송할 구성원 데이터가 없습니다.");
          return;
      }

      // records.length가 아니라 전체 members.length를 보여주어 0건이라도 안심하고 보내게 함
      if (!window.confirm(`${currentDate} 기준 전체 구성원 ${members.length}명의 데이터를\n구글 시트로 전송하시겠습니까?\n(미체크 인원은 '대기' 상태로 전송됩니다)`)) return;

      setIsSyncing(true);
      try {
          console.log("Starting sync...");
          await sendToGoogleSheet(currentDate);
          alert('전송이 완료되었습니다!\n구글 시트에서 데이터를 확인해주세요.');
      } catch (e: any) {
          console.error("Sync failed", e);
          alert(`전송 실패: ${e.message}\n\n구글 시트의 'Apps Script' 배포 상태를 확인해주세요.`);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleStatusChange = (memberId: string, status: AttendanceStatus) => {
    const existing = records.find(r => r.memberId === memberId);
    
    // 1. 만약 현재 '휴가' 상태인데 다른 상태(출석/지각/결석)로 바꾸려 한다면 막음
    if (existing?.status === AttendanceStatus.EXCUSED && status !== AttendanceStatus.EXCUSED) {
        return; 
    }

    // 2. 만약 현재 '휴가' 상태인데 '휴가' 버튼을 다시 눌렀다면 -> 휴가 해제(초기화) 로직 실행
    if (existing?.status === AttendanceStatus.EXCUSED && status === AttendanceStatus.EXCUSED) {
        const memberName = members.find(m => m.id === memberId)?.name;
        if (window.confirm(`${memberName} 님의 휴가 상태를 해제하시겠습니까?\n(상태가 '미체크'로 변경됩니다)`)) {
            const newRecord: AttendanceRecord = {
                ...existing,
                status: AttendanceStatus.PENDING,
                note: existing.note ? existing.note + " (휴가 해제됨)" : "휴가 해제됨",
                checkInTime: '',
                checkOutTime: ''
            };
            saveRecord(newRecord);
            loadData();
        }
        return;
    }

    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `${currentDate}-${memberId}`,
      memberId,
      date: currentDate,
      status,
      note: existing?.note || '',
      checkInTime: existing?.checkInTime || (status === AttendanceStatus.PRESENT ? new Date().toTimeString().slice(0, 5) : ''),
      checkOutTime: existing?.checkOutTime || ''
    };
    saveRecord(newRecord);
    loadData();
  };

  const handleNoteChange = (memberId: string, note: string) => {
    const existing = records.find(r => r.memberId === memberId);
    if (existing) {
       const newRecord = { ...existing, note };
       saveRecord(newRecord);
       loadData();
    }
  };

  const handleTimeChange = (memberId: string, field: 'checkInTime' | 'checkOutTime', value: string) => {
      const existing = records.find(r => r.memberId === memberId);
      if (existing) {
          const newRecord = { ...existing, [field]: value };
          saveRecord(newRecord);
          loadData();
      }
  };

  // Batch Operations
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBatchStatus = (status: AttendanceStatus) => {
    let skipped = 0;
    let processed = 0;

    selectedIds.forEach(id => {
      const currentStatus = getMemberStatus(id);
      if (currentStatus === AttendanceStatus.EXCUSED && status !== AttendanceStatus.EXCUSED) {
          skipped++;
          return;
      }

      const existing = records.find(r => r.memberId === id);
      const newRecord: AttendanceRecord = {
          id: existing ? existing.id : `${currentDate}-${id}`,
          memberId: id,
          date: currentDate,
          status,
          note: existing?.note || '',
          checkInTime: existing?.checkInTime || (status === AttendanceStatus.PRESENT ? new Date().toTimeString().slice(0, 5) : ''),
          checkOutTime: existing?.checkOutTime || ''
      };
      saveRecord(newRecord);
      processed++;
    });

    if (skipped > 0) {
        alert(`총 ${processed}명 처리되었습니다.\n(휴가 중인 인원 ${skipped}명은 변경되지 않았습니다)`);
    }

    loadData();
    setSelectedIds(new Set()); 
  };

  const handleBatchTime = (field: 'checkInTime' | 'checkOutTime', time: string) => {
    let skipped = 0;
    let processed = 0;

    selectedIds.forEach(id => {
      const existing = records.find(r => r.memberId === id);
      
      if (existing?.status === AttendanceStatus.EXCUSED) {
          skipped++;
          return;
      }

      const newRecord: AttendanceRecord = {
        id: existing ? existing.id : `${currentDate}-${id}`,
        memberId: id,
        date: currentDate,
        status: existing?.status || AttendanceStatus.PRESENT, 
        note: existing?.note || '',
        checkInTime: existing?.checkInTime || '',
        checkOutTime: existing?.checkOutTime || ''
      };
      
      newRecord[field] = time;
      
      if (field === 'checkInTime' && (!existing || existing.status === AttendanceStatus.PENDING)) {
         newRecord.status = AttendanceStatus.PRESENT;
      }

      saveRecord(newRecord);
      processed++;
    });
    
    if (skipped > 0) {
        alert(`총 ${processed}명 시간 입력이 완료되었습니다.\n(휴가 중인 인원 ${skipped}명은 제외되었습니다)`);
    }

    loadData();
    setSelectedIds(new Set());
  };

  const teams = ['All', ...Array.from(new Set(members.map(m => m.team)))];
  const locations = ['All', ...Array.from(new Set(members.map(m => m.workLocation).filter(Boolean) as string[]))];
  const places = ['All', ...Array.from(new Set(members.map(m => m.workPlace).filter(Boolean) as string[]))];

  const filteredMembers = members.filter(m => {
    const matchTeam = filterTeam === 'All' || m.team === filterTeam;
    const matchLocation = filterLocation === 'All' || m.workLocation === filterLocation;
    const matchPlace = filterPlace === 'All' || m.workPlace === filterPlace;
    const matchSearch = m.name.includes(searchTerm) || m.team.includes(searchTerm) || 
                       (m.workLocation && m.workLocation.includes(searchTerm));
    return matchTeam && matchLocation && matchPlace && matchSearch;
  });

  const getMemberStatus = (id: string) => {
    return records.find(r => r.memberId === id)?.status || AttendanceStatus.PENDING;
  };
  
  const getMemberRecord = (id: string) => records.find(r => r.memberId === id);

  const getDayName = (dateStr: string) => {
      const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      return days[new Date(dateStr).getDay()];
  };

  const StatusButton = ({ status, current, onClick, icon: Icon, color, disabled }: any) => (
    <button
      onClick={(e) => { 
          e.stopPropagation(); 
          if (!disabled || status === AttendanceStatus.EXCUSED) onClick(); 
      }}
      disabled={disabled && status !== AttendanceStatus.EXCUSED} 
      className={`p-2 rounded-md flex items-center justify-center transition-all ${
        current === status 
        ? `${color} ring-2 ring-offset-1 ring-slate-300 shadow-md` 
        : disabled && status !== AttendanceStatus.EXCUSED
            ? 'text-slate-200 cursor-not-allowed opacity-50 bg-slate-50' 
            : 'text-slate-400 hover:bg-slate-100'
      }`}
      title={disabled ? '휴가 중에는 변경할 수 없습니다' : status}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
             <CalendarDays size={24}/>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                출석 체크 관리
            </h2>
            
            <div className="flex items-center gap-2 mt-1">
                {/* INVISIBLE OVERLAY DATE PICKER - Guaranteed to work */}
                <div className="relative inline-flex items-center gap-2 group cursor-pointer">
                    {/* Visual Layer (What the user sees) */}
                    <div className="flex items-center gap-2 pointer-events-none">
                        <div className="px-3 py-1.5 bg-white border-2 border-blue-500 rounded-lg text-lg font-bold text-slate-800 shadow-sm min-w-[130px] text-center">
                            {currentDate}
                        </div>
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm whitespace-nowrap hidden sm:block">
                            {getDayName(currentDate)}
                        </span>
                        <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                            <Calendar size={20} />
                        </div>
                    </div>
                    {/* Interaction Layer (Invisible Input) - What the user actually clicks */}
                    <input 
                      type="date" 
                      value={currentDate}
                      onChange={(e) => onDateChange(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                </div>

                {/* Manual Sync Button - Added relative z-50 to ensure clickability over potential overlays */}
                <button 
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className={`ml-2 relative z-50 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-sm
                      ${isSyncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}
                  `}
                >
                    {isSyncing ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18}/>}
                    {isSyncing ? '전송 중...' : '구글 시트 전송'}
                </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
            <input
              type="text"
              placeholder="이름, 부서 검색"
              className="pl-9 pr-4 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm font-medium text-indigo-900 placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all w-full sm:w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                <select
                className="pl-9 pr-8 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                >
                {teams.map(t => <option key={t} value={t}>{t === 'All' ? '전체 부서' : t}</option>)}
                </select>
            </div>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                <select
                className="pl-9 pr-8 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                >
                <option value="All">전체 이용구분</option>
                {locations.filter(l => l !== 'All').map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>
            <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                <select
                className="pl-9 pr-8 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                value={filterPlace}
                onChange={(e) => setFilterPlace(e.target.value)}
                >
                <option value="All">전체 층</option>
                {places.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Toolbar - Appears when items are selected */}
      {selectedIds.size > 0 && (
         <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg flex flex-col lg:flex-row items-center justify-between animate-fade-in z-20 gap-4">
            <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
               <span className="font-bold px-3 py-1 bg-slate-700 rounded-lg border border-slate-600 flex items-center gap-2">
                 <CheckSquare size={16}/> {selectedIds.size}명 선택됨
               </span>
               
               <div className="flex gap-2">
                  <button onClick={() => handleBatchStatus(AttendanceStatus.PRESENT)} className="px-3 py-1.5 hover:bg-green-600 rounded text-sm bg-green-700 transition-colors font-medium">출석</button>
                  <button onClick={() => handleBatchStatus(AttendanceStatus.LATE)} className="px-3 py-1.5 hover:bg-yellow-600 rounded text-sm bg-yellow-700 transition-colors font-medium">지각</button>
                  <button onClick={() => handleBatchStatus(AttendanceStatus.ABSENT)} className="px-3 py-1.5 hover:bg-red-600 rounded text-sm bg-red-700 transition-colors font-medium">결석</button>
               </div>
            </div>

            <div className="h-px w-full lg:w-px lg:h-8 bg-slate-600"></div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
               <div className="flex items-center gap-2 bg-slate-700 p-1.5 rounded-lg border border-slate-600">
                  <Clock size={16} className="text-slate-400 ml-1"/>
                  <input 
                    type="time" 
                    value={batchCheckIn} 
                    onChange={(e) => setBatchCheckIn(e.target.value)}
                    className="bg-slate-800 border-none text-white text-sm rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 w-24 cursor-pointer font-bold"
                  />
                  <button 
                    onClick={() => handleBatchTime('checkInTime', batchCheckIn)} 
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors whitespace-nowrap"
                  >
                    일괄 출근
                  </button>
               </div>
               
               <div className="flex items-center gap-2 bg-slate-700 p-1.5 rounded-lg border border-slate-600">
                  <LogOut size={16} className="text-slate-400 ml-1"/>
                  <input 
                    type="time" 
                    value={batchCheckOut} 
                    onChange={(e) => setBatchCheckOut(e.target.value)}
                    className="bg-slate-800 border-none text-white text-sm rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 w-24 cursor-pointer font-bold"
                  />
                  <button 
                    onClick={() => handleBatchTime('checkOutTime', batchCheckOut)} 
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm transition-colors whitespace-nowrap"
                  >
                    일괄 퇴근
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-4 w-12 text-center">
                 <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.size > 0 && selectedIds.size === filteredMembers.length ? <CheckSquare size={20}/> : <Square size={20}/>}
                 </button>
              </th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">이름/부서</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">상태 설정</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">출근 시간</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">퇴근 시간</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMembers.map((member) => {
              const currentStatus = getMemberStatus(member.id);
              const record = getMemberRecord(member.id);
              const isExcused = currentStatus === AttendanceStatus.EXCUSED;
              
              const rowBg = currentStatus === AttendanceStatus.PENDING ? '' : 'bg-slate-50/50';
              const isSelected = selectedIds.has(member.id);
              
              return (
                <tr 
                  key={member.id} 
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${rowBg} 
                    ${isSelected ? 'bg-blue-50 hover:bg-blue-50' : ''} 
                    ${isExcused ? 'bg-purple-50/40' : ''}
                  `}
                  onClick={() => toggleSelect(member.id)}
                >
                  <td className="p-4 text-center">
                      <div className={`transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                        {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                      </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm relative
                        ${member.id.charCodeAt(4) % 2 === 0 ? 'bg-indigo-500' : 'bg-blue-500'}
                      `}>
                        {member.name.slice(0, 1)}
                        {isExcused && (
                            <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-0.5 border-2 border-white" title="휴가중">
                                <Lock size={10} className="text-white" />
                            </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="font-medium text-slate-900">{member.name}</p>
                           {member.workLocation && (
                               <span className={`text-[10px] px-1.5 py-0.5 rounded border 
                                   ${member.workLocation === '시설' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}
                               `}>
                                   {member.workLocation}
                               </span>
                           )}
                           {member.workPlace && (
                               <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                                   {member.workPlace}
                               </span>
                           )}
                        </div>
                        <p className="text-xs text-slate-500">{member.team} · {member.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit mx-auto shadow-sm" onClick={e => e.stopPropagation()}>
                      <StatusButton 
                        status={AttendanceStatus.PRESENT} 
                        current={currentStatus} 
                        onClick={() => handleStatusChange(member.id, AttendanceStatus.PRESENT)}
                        icon={CheckCircle}
                        color="bg-green-100 text-green-600"
                        disabled={isExcused} 
                      />
                      <StatusButton 
                        status={AttendanceStatus.LATE} 
                        current={currentStatus} 
                        onClick={() => handleStatusChange(member.id, AttendanceStatus.LATE)}
                        icon={Clock}
                        color="bg-yellow-100 text-yellow-600"
                        disabled={isExcused} 
                      />
                      <StatusButton 
                        status={AttendanceStatus.ABSENT} 
                        current={currentStatus} 
                        onClick={() => handleStatusChange(member.id, AttendanceStatus.ABSENT)}
                        icon={XCircle}
                        color="bg-red-100 text-red-600"
                        disabled={isExcused} 
                      />
                      <StatusButton 
                        status={AttendanceStatus.EXCUSED} 
                        current={currentStatus} 
                        onClick={() => handleStatusChange(member.id, AttendanceStatus.EXCUSED)}
                        icon={Calendar}
                        color="bg-purple-100 text-purple-600"
                        disabled={false} // 휴가 상태 해제(풀기)를 위해 휴가 버튼은 항상 활성화
                      />
                    </div>
                  </td>
                  <td className="p-4" onClick={e => e.stopPropagation()}>
                     <div className="flex items-center gap-2">
                         <Clock size={16} className={record?.checkInTime ? "text-blue-500" : "text-slate-300"}/>
                         <input 
                           type="time" 
                           className={`border-2 rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-blue-500 w-32 transition-all shadow-sm
                                ${isExcused ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-blue-50 border-blue-200 text-blue-900 focus:border-blue-500 focus:bg-white'}`}
                           value={record?.checkInTime || ''}
                           disabled={isExcused}
                           onChange={(e) => handleTimeChange(member.id, 'checkInTime', e.target.value)}
                         />
                     </div>
                  </td>
                  <td className="p-4" onClick={e => e.stopPropagation()}>
                     <div className="flex items-center gap-2">
                         <LogOut size={16} className={record?.checkOutTime ? "text-slate-700" : "text-slate-300"}/>
                         <input 
                           type="time" 
                           className={`border-2 rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-blue-500 w-32 transition-all shadow-sm
                                ${isExcused ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-slate-500 focus:bg-white'}`}
                           value={record?.checkOutTime || ''}
                           disabled={isExcused}
                           onChange={(e) => handleTimeChange(member.id, 'checkOutTime', e.target.value)}
                         />
                     </div>
                  </td>
                  <td className="p-4" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      placeholder={isExcused ? "휴가중입니다" : "특이사항..."}
                      className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                      value={record?.note || ''}
                      onChange={(e) => handleNoteChange(member.id, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredMembers.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};