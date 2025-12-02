
export enum AttendanceStatus {
  PRESENT = '출석',
  LATE = '지각',
  ABSENT = '결석',
  EXCUSED = '휴가/공가',
  PENDING = '미체크'
}

export interface Member {
  id: string;
  name: string;
  team: string; // e.g., '개발팀', '영업팀'
  position: string; // e.g., '팀장', '사원'
  workLocation?: string; // e.g., '시설', '재가'
  workPlace?: string; // e.g., '1층', '2층'
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string; // ISO format YYYY-MM-DD
  status: AttendanceStatus;
  note?: string; // Late reason or general note
  checkInTime?: string; // HH:MM
  checkOutTime?: string; // HH:MM
}

// Aggregated stats for dashboard
export interface DailyStats {
  date: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

export enum VacationStatus {
  PENDING = '대기 (사무국장)',
  SECRETARY_APPROVED = '사무국장 승인 (원장 대기)',
  FINAL_APPROVED = '최종 승인 (완료)',
  REJECTED = '반려됨'
}

export interface VacationRequest {
  id: string;
  memberId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: string;      // 연차, 반차, 공가 등
  reason: string;
  status: VacationStatus;
  requestDate: string;
}

export interface VacationBalance {
  memberId: string;
  totalDays: number; // 총 연차 (기본 15)
  usedDays: number;  // 사용 연차
}
