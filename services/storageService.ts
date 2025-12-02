
import { Member, AttendanceRecord, AttendanceStatus, DailyStats, VacationRequest, VacationStatus, VacationBalance } from '../types';
import { INITIAL_MEMBERS } from '../constants';

const MEMBERS_KEY = 'attendance_app_members';
const RECORDS_KEY = 'attendance_app_records';
const VACATIONS_KEY = 'attendance_app_vacations';
const VACATION_BALANCES_KEY = 'attendance_app_vacation_balances';
const SHEET_URL_KEY = 'attendance_app_sheet_url';

export const getMembers = (): Member[] => {
  const stored = localStorage.getItem(MEMBERS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with dummy data if empty
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(INITIAL_MEMBERS));
  return INITIAL_MEMBERS;
};

// Function to force update members from code (constants.ts)
export const resetMembersFromCode = () => {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(INITIAL_MEMBERS));
    // window.location.reload(); // Handled in UI component
};

export const updateMembers = (newMembers: Member[]) => {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(newMembers));
};

export const getRecords = (): AttendanceRecord[] => {
  const stored = localStorage.getItem(RECORDS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveRecord = (record: AttendanceRecord) => {
  const records = getRecords();
  const existingIndex = records.findIndex(r => r.memberId === record.memberId && r.date === record.date);
  
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const getRecordsByDate = (date: string): AttendanceRecord[] => {
  const records = getRecords();
  return records.filter(r => r.date === date);
};

export const getDailyStats = (date: string): DailyStats => {
  const records = getRecordsByDate(date);
  const members = getMembers();
  
  const stats = {
    date,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    total: members.length
  };

  records.forEach(r => {
    if (r.status === AttendanceStatus.PRESENT) stats.present++;
    if (r.status === AttendanceStatus.LATE) stats.late++;
    if (r.status === AttendanceStatus.ABSENT) stats.absent++;
    if (r.status === AttendanceStatus.EXCUSED) stats.excused++;
  });

  return stats;
};

// ==========================================
// Vacation & Balance Logic
// ==========================================

export const getVacationRequests = (): VacationRequest[] => {
  const stored = localStorage.getItem(VACATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveVacationRequest = (request: VacationRequest) => {
  const requests = getVacationRequests();
  requests.push(request);
  localStorage.setItem(VACATIONS_KEY, JSON.stringify(requests));
};

export const getVacationBalances = (): VacationBalance[] => {
  const stored = localStorage.getItem(VACATION_BALANCES_KEY);
  let balances: VacationBalance[] = stored ? JSON.parse(stored) : [];
  
  // Ensure all current members have a balance entry
  const members = getMembers();
  let changed = false;

  members.forEach(m => {
      if (!balances.find(b => b.memberId === m.id)) {
          balances.push({ memberId: m.id, totalDays: 15, usedDays: 0 });
          changed = true;
      }
  });

  if (changed) {
      localStorage.setItem(VACATION_BALANCES_KEY, JSON.stringify(balances));
  }
  
  return balances;
};

export const saveVacationBalances = (balances: VacationBalance[]) => {
    localStorage.setItem(VACATION_BALANCES_KEY, JSON.stringify(balances));
};

// Calculate business days (excluding weekends)
export const calculateBusinessDays = (startDateStr: string, endDateStr: string): number => {
    let count = 0;
    const curDate = new Date(startDateStr);
    const stopDate = new Date(endDateStr);
    
    // Normalize time to avoid issues
    curDate.setHours(12, 0, 0, 0);
    stopDate.setHours(12, 0, 0, 0);

    while (curDate <= stopDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0=Sun, 6=Sat
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

const applyVacationToAttendance = (request: VacationRequest) => {
  // 1. Create Attendance Records
  let records = getRecords(); 
  
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  
  startDate.setHours(12, 0, 0, 0);
  endDate.setHours(12, 0, 0, 0);

  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay(); 
    
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        const existingIndex = records.findIndex(r => r.memberId === request.memberId && r.date === dateStr);
        
        const newRecord: AttendanceRecord = {
            id: `${dateStr}-${request.memberId}`,
            memberId: request.memberId,
            date: dateStr,
            status: AttendanceStatus.EXCUSED,
            note: `휴가(${request.type}): ${request.reason}`,
            checkInTime: '', 
            checkOutTime: ''
        };

        if (existingIndex >= 0) {
            records[existingIndex] = newRecord;
        } else {
            records.push(newRecord);
        }
    }
    current.setDate(current.getDate() + 1);
  }
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));

  // 2. Deduct Vacation Balance
  // 연차, 반차인 경우에만 차감 (공가, 병가는 차감 X)
  if (request.type === '연차' || request.type.includes('반차')) {
      const balances = getVacationBalances();
      const balanceIndex = balances.findIndex(b => b.memberId === request.memberId);
      
      if (balanceIndex >= 0) {
          let deductAmount = 0;
          if (request.type.includes('반차')) {
              deductAmount = 0.5; // 반차는 0.5일
          } else {
              deductAmount = calculateBusinessDays(request.startDate, request.endDate); // 연차는 기간만큼 (주말제외)
          }
          
          balances[balanceIndex].usedDays += deductAmount;
          saveVacationBalances(balances);
      }
  }
};

export const updateVacationStatus = (requestId: string, status: VacationStatus) => {
  const requests = getVacationRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index !== -1) {
    const prevStatus = requests[index].status;
    requests[index].status = status;
    localStorage.setItem(VACATIONS_KEY, JSON.stringify(requests));

    // Only apply changes if transitioning TO Final Approved
    // And ensure we haven't already applied it (though simplest way is just checking the new status)
    if (status === VacationStatus.FINAL_APPROVED && prevStatus !== VacationStatus.FINAL_APPROVED) {
      applyVacationToAttendance(requests[index]);
    }
  }
};

// ==========================================
// CSV & Sheet Integration
// ==========================================

export const generateCSV = (): string => {
  const members = getMembers();
  const records = getRecords();
  
  let csvContent = "\uFEFF"; 
  csvContent += "날짜,이름,부서,직급,이용구분,상세장소,상태,비고,출근시간,퇴근시간\n";

  records.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    const memberA = members.find(m => m.id === a.memberId);
    const memberB = members.find(m => m.id === b.memberId);
    if (memberA?.team !== memberB?.team) return (memberA?.team || '').localeCompare(memberB?.team || '');
    return (memberA?.name || '').localeCompare(memberB?.name || '');
  });

  records.forEach(r => {
    const member = members.find(m => m.id === r.memberId);
    if (!member) return;
    
    const row = [
      r.date,
      member.name,
      member.team,
      member.position,
      member.workLocation || '',
      member.workPlace || '',
      r.status,
      `"${r.note || ''}"`, 
      r.checkInTime || '',
      r.checkOutTime || ''
    ];
    csvContent += row.join(",") + "\n";
  });

  return csvContent;
};

export const generateTemplateCSV = (): string => {
    let csvContent = "\uFEFF"; 
    csvContent += "이름,부서,직급,이용구분,상세장소\n";
    csvContent += "홍길동,영업팀,사원,시설,1층\n";
    csvContent += "김철수,개발팀,팀장,시설,2층\n";
    csvContent += "이영희,관리팀,대리,재가,1층\n";
    return csvContent;
};

export const clearAllData = () => {
    localStorage.removeItem(MEMBERS_KEY);
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(VACATIONS_KEY);
    localStorage.removeItem(VACATION_BALANCES_KEY);
    localStorage.removeItem(SHEET_URL_KEY);
    window.location.reload();
}

export const saveSheetUrl = (url: string) => {
    localStorage.setItem(SHEET_URL_KEY, url);
};

export const getSheetUrl = () => {
    return localStorage.getItem(SHEET_URL_KEY) || '';
};

export const sendToGoogleSheet = async (date: string) => {
    const url = getSheetUrl();
    if (!url) throw new Error("구글 시트 URL이 설정되지 않았습니다. 설정에서 URL을 입력해주세요.");

    const members = getMembers();
    const records = getRecordsByDate(date);
    
    const payloadData = members.map(member => {
        const record = records.find(r => r.memberId === member.id);
        return {
            date: date,
            name: member.name,
            team: member.team,
            position: member.position,
            workLocation: member.workLocation || '',
            workPlace: member.workPlace || '',
            status: record?.status || AttendanceStatus.PENDING,
            note: record?.note || '',
            checkInTime: record?.checkInTime || '',
            checkOutTime: record?.checkOutTime || ''
        };
    }).filter(item => item.status !== AttendanceStatus.PENDING); 

    if (payloadData.length === 0) {
        throw new Error("해당 날짜에 전송할 기록(출석/결석 등)이 없습니다.");
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            redirect: 'follow', 
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify({ records: payloadData }),
        });

        if (!response.ok) {
            throw new Error(`서버 응답 오류 (상태 코드: ${response.status})`);
        }
        
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            if (json.result === 'error') {
                throw new Error(json.message || json.error || '스크립트 에러 발생');
            }
            return json;
        } catch (e) {
            if (text.includes('Error') || text.includes('Exception')) {
                throw new Error('스크립트 실행 중 오류가 발생했습니다. 권한 설정을 확인하세요.');
            }
            return text;
        }
    } catch (error) {
        console.error("Google Sheet Send Error:", error);
        throw error;
    }
};
