
import React, { useState, useRef, useEffect } from 'react';
import { generateCSV, clearAllData, resetMembersFromCode, generateTemplateCSV, updateMembers, saveSheetUrl, getSheetUrl, sendToGoogleSheet } from '../services/storageService';
import { Download, FileSpreadsheet, Trash2, Copy, Check, Users, RefreshCw, Upload, FileDown, Settings, HelpCircle, AlertOctagon, CloudUpload, Link, ChevronDown, ChevronUp, LogOut, Shield } from 'lucide-react';
import { Member } from '../types';

export const DataExport: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');

  const [copied, setCopied] = useState(false);
  const [encoding, setEncoding] = useState<'utf-8' | 'euc-kr'>('utf-8');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheet State
  const [sheetUrl, setSheetUrl] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
      setSheetUrl(getSheetUrl());
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in">
         <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 max-w-sm w-full text-center">
             <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                 <Shield size={32}/>
             </div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">관리자 인증</h2>
             <p className="text-sm text-slate-500 mb-6">데이터 관리는 관리자만 접근 가능합니다.</p>
             <form onSubmit={(e) => {
                 e.preventDefault();
                 if(password === '1234') setIsAdmin(true);
                 else alert('비밀번호가 올바르지 않습니다.');
             }}>
                 <input 
                   type="password" 
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="비밀번호 입력 (1234)"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   autoFocus
                 />
                 <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-900 transition-colors">
                     확인
                 </button>
             </form>
         </div>
      </div>
    );
  }

  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateTemplateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `member_upload_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = () => {
      const csv = generateCSV();
      const tsv = csv.replace(/,/g, '\t');
      navigator.clipboard.writeText(tsv).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  }

  const handleResetMembers = () => {
      if(window.confirm("코드(constants.ts)에 저장된 기본 명단으로 되돌리시겠습니까?\n\n현재 화면에 보이는 구성원 목록이 삭제되고, 코드에 작성된 1층/2층/재가 데이터가 적용됩니다.\n(출석 기록은 유지됩니다)")) {
          resetMembersFromCode();
          alert("명단 초기화가 완료되었습니다.\n확인을 누르면 페이지가 새로고침 됩니다.");
          window.location.reload();
      }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        try {
            const rows = text.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
            
            if (rows.length < 2) {
                alert('데이터가 없는 파일이거나 형식이 잘못되었습니다.\n첫 번째 줄은 헤더(이름, 부서, 직급, 이용구분, 상세장소)여야 합니다.');
                return;
            }

            const newMembers: Member[] = [];
            
            for (let i = 1; i < rows.length; i++) {
                const cleanRow = rows[i].replace(/"/g, ''); 
                const cols = cleanRow.split(',').map(c => c.trim());
                
                if (cols.length >= 2 && cols[0] !== '') {
                    newMembers.push({
                        id: `mem-imp-${Date.now()}-${i}`,
                        name: cols[0],
                        team: cols[1] || '미배정',
                        position: cols[2] || '사원',
                        workLocation: cols[3] || '',
                        workPlace: cols[4] || ''
                    });
                }
            }

            if (newMembers.length > 0) {
                const previewNames = newMembers.slice(0, 3).map(m => m.name).join(', ');
                const moreCount = newMembers.length > 3 ? ` 외 ${newMembers.length - 3}명` : '';
                
                const message = `총 ${newMembers.length}명의 명단을 발견했습니다.\n\n` +
                                `미리보기: [ ${previewNames}${moreCount} ]\n\n` +
                                `이름이 정상적으로 보이나요?\n` +
                                `확인을 누르면 기존 명단이 삭제되고 위 명단으로 교체됩니다.`;

                if (window.confirm(message)) {
                    updateMembers(newMembers);
                    alert('명단이 성공적으로 업데이트되었습니다.');
                    window.location.reload();
                }
            } else {
                alert('유효한 데이터 형식이 아닙니다. CSV 파일 내용을 확인해주세요.');
            }

        } catch (error) {
            console.error(error);
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
    };

    reader.onerror = () => {
        alert('파일 읽기 실패');
    };

    reader.readAsText(file, encoding);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
      if(window.confirm("정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
          clearAllData();
      }
  }

  const handleSaveUrl = () => {
      if (!sheetUrl.includes('/exec')) {
          alert("URL 형식이 올바르지 않습니다.\nURL 끝이 '/exec'로 끝나야 합니다.\n복사한 웹 앱 URL을 다시 확인해주세요.");
          return;
      }
      saveSheetUrl(sheetUrl);
      alert('URL이 저장되었습니다.\n\n[테스트 방법]\n인터넷 주소창에 저장한 URL을 붙여넣고 엔터를 쳐보세요.\n"연결 성공" 메시지가 나오면 정상입니다.');
  };

  const handleSendToSheet = async () => {
      if (!sheetUrl) {
          alert('먼저 구글 Apps Script 웹 앱 URL을 저장해주세요.');
          return;
      }

      const today = new Date().toISOString().slice(0, 10);
      if (!window.confirm(`${today} 날짜의 데이터를 구글 시트로 전송하시겠습니까?\n(기존 데이터가 있다면 업데이트됩니다)`)) return;

      setIsSending(true);
      try {
          await sendToGoogleSheet(today);
          alert('전송이 완료되었습니다! 구글 시트를 확인해보세요.');
      } catch (e: any) {
          alert(`전송 실패\n\n원인: ${e.message}\n\n[해결책]\n1. 구글 시트에서 '배포' > '새 배포'를 다시 했는지 확인하세요.\n2. 접근 권한이 '모든 사용자(Anyone)'인지 확인하세요.`);
      } finally {
          setIsSending(false);
      }
  };

  // Improved Apps Script v7: Strong date normalization
  const appsScriptCode = `function doGet(e) {
  return ContentService.createTextOutput("연결 성공! 스크립트가 정상 작동 중입니다.").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var records = data.records;
    
    // 1. 헤더가 없으면 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["전송일시", "날짜", "이름", "부서", "직급", "이용구분", "상세장소", "상태", "비고", "출근시간", "퇴근시간"]);
    }
    
    // 2. 기존 데이터 로드
    // getDisplayValues()를 사용하여 셀에 보이는 그대로 가져옴
    var lastRow = sheet.getLastRow();
    var existingData = [];
    if (lastRow > 1) {
      existingData = sheet.getRange(2, 2, lastRow - 1, 2).getDisplayValues(); // B열(날짜), C열(이름)
    }
    
    var updates = [];
    var appends = [];
    var timestamp = new Date().toLocaleString();

    // 날짜 정규화 헬퍼 함수 (숫자만 남김: 2024-05-21 -> 20240521)
    // 시트의 서식이 달라도(2024. 5. 21) 숫자만 비교하여 매칭률 극대화
    var normalizeDate = function(d) {
        if(!d) return "";
        return d.toString().replace(/[^0-9]/g, "").slice(0, 8); 
    };

    records.forEach(function(record) {
      var foundRowIndex = -1;
      var targetDate = normalizeDate(record.date);
      
      // 기존 데이터 스캔
      for (var i = 0; i < existingData.length; i++) {
        var exDate = normalizeDate(existingData[i][0]);
        var exName = existingData[i][1].toString().trim();
        
        if (exDate === targetDate && exName == record.name.trim()) {
          foundRowIndex = i + 2; 
          break;
        }
      }

      if (foundRowIndex !== -1) {
        // [업데이트]
        sheet.getRange(foundRowIndex, 1).setValue(timestamp);
        sheet.getRange(foundRowIndex, 8, 1, 4).setValues([[record.status, record.note, record.checkInTime, record.checkOutTime]]);
      } else {
        // [추가]
        appends.push([
          timestamp,
          record.date, record.name, record.team, record.position, 
          record.workLocation, record.workPlace, 
          record.status, record.note, record.checkInTime, record.checkOutTime
        ]);
      }
    });

    if (appends.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, appends[0].length).setValues(appends);
    }

    return ContentService.createTextOutput(JSON.stringify({"result":"success", "updates": records.length}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"result":"error", "message": err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12 relative">
      <div className="absolute top-0 right-0">
          <button onClick={() => { setIsAdmin(false); setPassword(''); }} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <LogOut size={12}/> 관리자 모드 종료
          </button>
      </div>
      
      {/* 1. Google Sheet Integration */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <CloudUpload className="text-green-600"/> 구글 시트 연동 설정
          </h2>
          <p className="text-slate-500 mb-6">
              출석/퇴근 데이터를 구글 시트에 안전하게 저장합니다.
          </p>

          <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-6">
              <button 
                  onClick={() => setIsGuideOpen(!isGuideOpen)}
                  className="flex items-center justify-between w-full text-left font-bold text-green-800 focus:outline-none"
              >
                  <span className="flex items-center gap-2"><HelpCircle size={18}/> 실시간 연동 설정 가이드 (코드 업데이트 필수)</span>
                  {isGuideOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
              </button>
              
              {isGuideOpen && (
                  <div className="mt-4 space-y-4 text-sm text-slate-700 bg-white p-4 rounded-lg border border-green-200">
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded font-bold mb-4 animate-pulse-slow">
                          ⚠️ 스크립트가 v7 (최종)로 업데이트 되었습니다. 반드시 아래 새 코드로 교체하고 [새 배포] 해주세요.
                      </div>
                      <ol className="list-decimal list-inside space-y-3">
                          <li>
                              새 구글 스프레드시트를 만들고, 상단 메뉴 <strong>확장 프로그램 &gt; Apps Script</strong>를 클릭합니다.
                          </li>
                          <li>
                              편집기에 아래 코드를 <strong>모두 지우고</strong> 복사해서 붙여넣습니다.
                              <div className="relative mt-2 mb-2">
                                <pre className="bg-slate-800 text-slate-200 p-3 rounded-md overflow-x-auto text-xs font-mono max-h-60 custom-scrollbar">{appsScriptCode}</pre>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(appsScriptCode)}
                                    className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                                >
                                    복사
                                </button>
                              </div>
                          </li>
                          <li>
                              오른쪽 상단 <strong>배포 &gt; 새 배포</strong>를 클릭합니다. (기존 배포 수정 X, 꼭 새 배포)
                          </li>
                          <li>
                              설정창에서 다음 내용을 꼭 확인하세요:
                              <ul className="list-disc list-inside ml-4 mt-1 text-slate-600 bg-slate-50 p-2 rounded">
                                  <li>설명: v7 (날짜인식개선)</li>
                                  <li>다음 사용자 권한으로 실행: <strong>나(Me)</strong></li>
                                  <li>액세스 권한이 있는 사용자: <strong>모든 사용자 (Anyone)</strong> <span className="text-red-500 font-bold">← 필수!</span></li>
                              </ul>
                          </li>
                          <li>
                              <strong>배포</strong> 버튼을 누르고 승인 과정을 거친 후, 생성된 <strong>웹 앱 URL</strong> (끝이 /exec)을 복사합니다.
                          </li>
                          <li>
                              복사한 URL을 아래 입력창에 붙여넣고 저장합니다.
                          </li>
                      </ol>
                  </div>
              )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Link size={16} className="text-blue-500"/> 구글 Apps Script 웹 앱 URL
                      {sheetUrl && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">연결됨</span>}
                  </label>
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="https://script.google.com/.../exec" 
                        className="flex-1 px-4 py-3 border-2 border-blue-100 bg-blue-50/50 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-mono text-slate-800 transition-all placeholder-slate-400"
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                      />
                      <button 
                        onClick={handleSaveUrl}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm"
                      >
                        주소 저장
                      </button>
                  </div>
                  <p className="text-xs text-slate-500 pl-1">
                      * URL은 반드시 <code>/exec</code>로 끝나야 합니다. (저장 후 전송 테스트를 권장합니다)
                  </p>
              </div>
              
              <button 
                onClick={handleSendToSheet}
                disabled={isSending || !sheetUrl}
                className={`px-6 py-3 rounded-lg font-bold text-white shadow-md transition-all flex items-center gap-2 whitespace-nowrap h-[50px]
                    ${isSending || !sheetUrl ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}
                `}
              >
                  {isSending ? (
                      <>전송 중...</>
                  ) : (
                      <><CloudUpload size={20}/> 전송 테스트</>
                  )}
              </button>
          </div>
      </div>

      {/* Member Management & Export sections... */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Users className="text-indigo-600"/> 구성원 명단 관리
          </h2>
          <p className="text-slate-500 mb-6">
              직원 명단을 업로드하거나 초기화할 수 있습니다.
          </p>
          
           <div className="flex flex-col gap-6 border-t border-slate-100 pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Settings size={14}/> 파일 인코딩 선택
                    </span>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                            type="radio" 
                            name="encoding" 
                            value="utf-8" 
                            checked={encoding === 'utf-8'}
                            onChange={() => setEncoding('utf-8')}
                            className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-600">UTF-8</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                            type="radio" 
                            name="encoding" 
                            value="euc-kr" 
                            checked={encoding === 'euc-kr'}
                            onChange={() => setEncoding('euc-kr')}
                            className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-600">EUC-KR</span>
                        </label>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 border border-slate-300 shadow-sm"><FileDown size={16}/> 양식 다운로드</button>
                    <div className="relative">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="csv-upload" />
                        <label htmlFor="csv-upload" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer shadow-md"><Upload size={16}/> 명단 업로드 (CSV)</label>
                    </div>
                  </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-200 rounded-full text-slate-600 mt-0.5"><RefreshCw size={16}/></div>
                      <div>
                          <h4 className="text-sm font-bold text-slate-800">기본 명단으로 복구</h4>
                          <p className="text-xs text-slate-500 mt-1">프로그램 내부 초기 명단(1층/2층 구분 적용됨)으로 되돌립니다.</p>
                      </div>
                  </div>
                  <button onClick={handleResetMembers} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">구성원 명단 초기화 (코드 반영)</button>
              </div>
          </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600"/> 파일로 데이터 내보내기
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-300 transition-colors cursor-pointer group" onClick={handleCopyToClipboard}>
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {copied ? <Check size={24}/> : <Copy size={24}/>}
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">클립보드 복사</h3>
                <p className="text-sm text-slate-500 mb-4">구글 시트(Ctrl+V)에 바로 붙여넣기 하세요.</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 hover:border-green-300 transition-colors cursor-pointer group" onClick={handleDownloadCSV}>
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <Download size={24}/>
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">기록 CSV 다운로드</h3>
                <p className="text-sm text-slate-500 mb-4">전체 데이터를 .csv 파일로 다운로드합니다.</p>
            </div>
        </div>
      </div>

      <div className="bg-red-50 p-8 rounded-xl shadow-sm border border-red-100">
          <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
              <AlertOctagon size={20}/> 시스템 초기화
          </h3>
          <button onClick={handleReset} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-600 hover:text-white transition-all shadow-sm">
              <Trash2 size={16} className="inline mr-2"/> 모든 데이터 영구 삭제 (초기화)
          </button>
      </div>
    </div>
  );
};
