
import { Member, AttendanceStatus } from './types';

// ==============================================================================
// [사용 가이드]
// 아래 목록에서 이름, 부서, 이용구분(시설/재가), 상세장소(1층/2층)를 수정하면 
// '데이터 관리' > '구성원 명단 초기화' 시 반영됩니다.
// 직급은 기본적으로 '이용인'으로 설정됩니다.
// ==============================================================================

const RAW_DATA = [
  // 근로팀 
  { name: '강구은', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '김인숙', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '김반석', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '김지은', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '김혜경', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '김혜영', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '박훈연', team: '근로팀', workLocation: '재가', workPlace: '2층' },
  { name: '변현진', team: '근로팀', workLocation: '시설', workPlace: '1층' },
  { name: '서정덕', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '심경석', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '원종미', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '유현종', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '이관종', team: '근로팀', workLocation: '시설', workPlace: '2층' },
  { name: '이대형', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '이연옥', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '전상일', team: '근로팀', workLocation: '시설', workPlace: '2층' },
  { name: '정성진', team: '근로팀', workLocation: '재가', workPlace: '1층' },
  { name: '최종욱', team: '근로팀', workLocation: '시설', workPlace: '1층' },
  { name: '최희숙', team: '근로팀', workLocation: '재가', workPlace: '2층' },
 
  // 훈련팀
  { name: '강병수', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '공순옥', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '김재영', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '박윤미', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '박은해', team: '훈련팀', workLocation: '재가', workPlace: '1층' },
  { name: '박제철', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '서기동', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '서명신', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '심운보', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '유정현', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '윤인숙', team: '훈련팀', workLocation: '재가', workPlace: '1층' },
  { name: '이기월', team: '훈련팀', workLocation: '재가', workPlace: '1층' },
  { name: '임수환', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '정순옥', team: '훈련팀', workLocation: '재가', workPlace: '2층' },
  { name: '조선일', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '채유미', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '홍종수', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '홍지만', team: '훈련팀', workLocation: '시설', workPlace: '2층' },
  { name: '황인선', team: '훈련팀', workLocation: '재가', workPlace: '1층' },

  // 일자리팀 
  { name: '문지원', team: '일자리팀', workLocation: '시설', workPlace: '1층' },
  { name: '최혜미', team: '일자리팀', workLocation: '재가', workPlace: '1층' },
];

export const INITIAL_MEMBERS: Member[] = RAW_DATA.map((data, index) => ({
  id: `mem-${index + 1}`,
  name: data.name,
  team: data.team,
  position: '이용인', 
  workLocation: data.workLocation,
  workPlace: data.workPlace,
}));

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: 'bg-green-100 text-green-800 border-green-200',
  [AttendanceStatus.LATE]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [AttendanceStatus.ABSENT]: 'bg-red-100 text-red-800 border-red-200',
  [AttendanceStatus.EXCUSED]: 'bg-purple-100 text-purple-800 border-purple-200',
  [AttendanceStatus.PENDING]: 'bg-slate-100 text-slate-500 border-slate-200',
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: '출석',
  [AttendanceStatus.LATE]: '지각',
  [AttendanceStatus.ABSENT]: '결석',
  [AttendanceStatus.EXCUSED]: '휴가',
  [AttendanceStatus.PENDING]: '대기',
};