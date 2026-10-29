# Duki Lab

프로그램 소개를 위한 독립 사이트입니다. 앱 소스는 포함하지 않으며, 설치 파일은 `Duki-Programming/Market-Peek-releases`의 공개 GitHub Release에서 제공합니다.

| 경로 | 내용 |
| --- | --- |
| `/` | 한국어 프로그램 목록 |
| `/en/` | 영어 프로그램 목록 |
| `/market-peek/` | Market Peek 한국어 소개·다운로드 |
| `/market-peek/en/` | Market Peek 영어 소개·다운로드 |

## 로컬 빌드

이 폴더에서 실행합니다. Jekyll 3은 실행 폴더의 레이아웃을 먼저 찾으므로 이 폴더로 이동한 뒤 빌드합니다.

```sh
bundle install
bundle exec jekyll build --destination dist
bundle exec jekyll serve --destination dist --host 127.0.0.1 --port 4100
```

Mac에서 기본 Ruby가 2.6인 경우 Homebrew Ruby를 먼저 선택합니다.

```sh
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
```

## GitHub Pages 배포

사이트 주소는 `https://duki-programming.github.io`, 저장소는 `Duki-Programming/duki-programming.github.io`입니다. 공개 `main` 브랜치 루트에서 GitHub Pages의 기본 Jekyll 빌드로 배포합니다.

수정 후 이 폴더에서 커밋하고 `git push origin main`으로 올리면 자동으로 갱신됩니다. `dist/`, 로컬 환경 설정, 다른 호스팅 서비스의 등록 정보는 원본과 함께 올리지 않습니다.

GitHub Pages를 처음 설정할 때에는 저장소 Settings → Pages에서 `Deploy from a branch`, `main`, `/ (root)`를 선택합니다. `_config.yml`의 `url`은 위 사이트 주소로 유지합니다.

영어 전환은 웹사이트에 적용됩니다. 현재 데스크톱 앱과 Windows 설치 프로그램은 한국어 버전입니다.

## 수정할 파일

- Google 사이트 소유권 확인 키: `_config.yml`의 `google_site_verification`. 확인 완료 후에도 키와 공통 메타태그를 유지합니다.
- 프로그램 목록·소개 문구: `_data/catalog.yml`
- Market Peek 문구: `_data/market_peek_copy.yml`
- 다운로드 초기값: `_data/market_peek.yml`
- 공개 릴리스 자동 갱신: `assets/js/market-peek-releases.js`
- 공통 프로그램 목록 화면: `_includes/catalog.html`, `_layouts/catalog.html`, `assets/css/catalog.css`
- Market Peek 화면: `_includes/market-peek-page.html`, `_layouts/product.html`, `assets/css/market-peek.css`

프로그램을 추가할 때에는 `_data/catalog.yml`의 한국어·영어 목록에 항목을 넣고, 항목의 `url`에 대응하는 소개 페이지를 만듭니다. 개인 홈페이지의 주소나 프로필 링크를 추가하지 않고도 프로그램별로 확장할 수 있습니다.

Google AdSense의 공개 게시자 ID와 기존 광고 코드를 포함합니다. 새 배포 주소에서의 광고 게재 여부는 AdSense의 사이트 등록·승인 상태에 따릅니다.

## Market Peek 버전 동기화

앱 저장소의 `npm run release:win` 또는 `npm run release:mac`이 배포 후 이 저장소의 `_data/market_peek.yml`을 공개 릴리스 기준으로 갱신합니다. GitHub Pages가 다시 빌드하므로 브라우저에서 GitHub API에 접속하지 못해도 최신 버전과 다운로드 링크를 볼 수 있습니다. 앱 저장소에서 `npm run release:site`만 실행해 사이트 데이터를 다시 갱신할 수도 있습니다. 실행 계정에는 이 사이트 저장소의 쓰기 권한이 필요합니다.

브라우저 스크립트는 정적 페이지보다 새 버전이 있을 때만 갱신하며, 오래된 캐시로 버전이나 Mac 다운로드 상태를 되돌리지 않습니다. `node --test tests/*.test.mjs`로 검증합니다.

## 개발자 팁

한국어·영어 Market Peek 페이지 상단의 다운로드 버튼 바로 아래에 `Tip the Developer!`를 가로로 넓게 표시합니다. `_data/support.yml`의 `ko.tip_url`과 `en.tip_url`에 각 언어에서 사용할 개발자 본인 명의의 HTTPS 결제·후원 페이지를 넣으면 안내창에서 해당 페이지로 연결됩니다. 한국어·영문 페이지 모두 같은 PayPal 수취 계정으로 연결됩니다. 언어 선택이 결제자의 국가를 확인하는 것은 아니므로 결제 가능 여부는 결제 서비스에서 결정합니다. 결제는 외부 제공자가 처리하며 이 사이트에서 카드 정보를 받지 않습니다. 해당 언어의 일반 결제 링크가 비어 있으면 그 탭은 표시하지 않으며, 다른 언어의 링크로 대체하지 않습니다. 링크는 앱 배포가 자동 갱신하는 릴리스 데이터와 분리되어 있습니다.

USDT 후원은 두 언어에서 모두 제공하며 `usdt_trc20.address`와 `usdt_trc20.min_deposit`를 사용합니다. 두 언어 모두 PayPal / USDT 탭으로 전환할 수 있습니다. 주소 복사가 차단되면 주소를 선택하고 수동 복사를 안내합니다. 입금 주소는 연결된 Bitget 계정의 인증된 조회 API에서 확인했으며, 사이트에는 공개 입금 주소만 저장합니다. API 키는 사이트에 포함하지 않습니다. Bitget 입금 주소나 최소 입금액이 바뀌면 이 데이터를 갱신해야 합니다. PayPal 금액은 고정하지 않으며 후원자가 USD 금액을 직접 입력합니다.

## 다운로드 좋아요

Tip 버튼 바로 아래의 “좋아요&다운로드로 응원하기”에서 따봉 버튼 하나와 응원 합계만 보여줍니다. 직접 따봉을 누르거나 다운로드 링크를 클릭하면 응원이 반영되며, 두 동작과 Windows·macOS를 모두 합쳐 IP당 최대 1개만 집계합니다. OS별 다운로드 기록은 내부에서만 관리합니다. 한국어·영문 페이지가 같은 집계를 공유합니다.

`_data/likes.yml`의 API는 Cloudflare Workers와 D1으로 운영하고, 중복 확인에는 서버 비밀키로 만든 HMAC을 고유 키로 사용합니다. 새 다운로드부터 누적 집계 테이블에 최초 클릭 시각과 원문 IP도 저장하고, 공개 응원 API에는 이를 반환하지 않습니다. 사이트의 다운로드 링크 클릭을 집계하며 파일 다운로드 완료·설치 여부나 GitHub의 전체 다운로드 횟수는 아닙니다. 같은 공인 IP는 각 OS의 한 표를 공유합니다. 서버 소스·마이그레이션·배포 방법은 `services/likes/README.md`에 있습니다. 설치 파일은 계속 GitHub Releases에서만 배포합니다.

### 개인 홈페이지와 프로그램 목록 공유

`/api/programs.json`은 `_data/catalog.yml`의 한국어 프로그램 목록에서 빌드할 때 자동 생성됩니다. 개인 홈페이지는 방문 시 이 목록을 불러와 자체 프로그램과 함께 표시합니다. 제목·설명·아이콘·링크·순서를 수정하고 이 사이트를 배포하면 개인 홈페이지를 다시 배포하지 않아도 다음 방문/새로고침에 반영됩니다. 개인 홈페이지 전용 프로그램은 유지됩니다.

## 두키 알리미 통계

`_config.yml`의 `notifier_api_url`에 Cloudflare Worker 주소를 설정하면 공통 카탈로그·제품 레이아웃에서 `notifier-analytics.js`를 실행합니다. 탭 세션에서 경로별 조회수를 1회 기록하고, 앱 소개 페이지의 실제 GitHub Release 파일 다운로드 클릭을 별도로 기록합니다. 쿼리 문자열이나 방문자 식별자는 보내지 않습니다. 비활성 버튼·섹션 이동·릴리스 노트는 다운로드에서 제외하며 같은 링크의 2초 내 더블클릭을 줄입니다. 브라우저 차단이나 오프라인에서는 누락될 수 있습니다.

기존 Market Peek 응원·다운로드 API는 그대로 유지합니다. 두키 알리미 앱은 기존 `platform_totals`의 IP·OS별 중복 제외 다운로드 합계를 읽으며 새 원시 클릭 수와 더하지 않습니다. 새 조회수는 이번 배포 이후부터 기록합니다. 조회 API는 전용 토큰이 필요하며 토큰은 공개 사이트 코드에 넣지 않습니다.

통계 API·아이폰·워치 원본은 별도 `DukiChoi/duki-notifier` 저장소에 있습니다. 검증: `node --test tests/*.test.mjs`, 기존 `services/likes` 테스트, Jekyll 빌드.

두키 알리미 다운로드 내역은 수집 시각과 Cloudflare가 제공한 원문 IP를 저장합니다. 조회수 이벤트도 기록 시각과 Cloudflare가 제공한 IP를 저장하고 앱의 별도 조회 기록 탭에 표시합니다. 기존 응원 API의 HMAC 집계와는 별도이며 최근 50건의 원문 IP는 조회 전용 토큰이 있는 통계 API에서만 반환합니다. 과거에 저장하지 않은 IP는 복원하지 않습니다.

조회 기록은 Market Peek 같은 개별 소개 페이지에 한정합니다. 메인 목록(`/`, `/en/`, 두 경로의 `index.html`)은 수집하지 않으며, 이미 열린 구버전 페이지에서 보내는 메인 조회 요청도 서버가 저장하지 않습니다. 기존 메인 조회 기록은 삭제하고 개별 소개 페이지·다운로드 기록은 유지합니다.

## Doro Modbus

- 한국어: https://duki-programming.github.io/doro-modbus/
- English: https://duki-programming.github.io/doro-modbus/en/
- Windows Beta: https://github.com/Duki-Programming/Doro-Modbus-releases/releases

`_includes/doro-modbus-page.html`과 `_data/doro_modbus_copy.yml`로 소개를 관리합니다. Market Peek의 제품 레이아웃, 후원 창, 좋아요 UI를 공유하고 Doro 전용 좋아요 Worker·D1을 사용합니다. 사이트 카탈로그와 `/api/programs.json`에도 등록되어 개인 홈페이지 프로그램 목록에 반영됩니다. 버전·다운로드 파일은 `_data/doro_modbus.yml`에 기록하며, 비공개 EngineSimulatorWeb의 `python build.py --doro-modbus --release --version 0.1.1` 명령이 릴리스 공개 후 자동 갱신합니다. 페이지는 GitHub API를 이용해 더 최신 공개 베타 EXE도 확인하며 API가 실패하면 빌드 시 기록된 다운로드를 유지합니다.

### Doro 놀이터와 게임 소개 스타일

Doro 페이지는 갈무리·스타더스트 픽셀 라벨, 역할 선택 미리보기, 스킬 목록, 연결 퀘스트로 구성합니다. 후원 버튼 바로 아래의 소개 문구는 언어별 `preview_lines` 세 항목으로 관리합니다. 맵 선택·일시정지·Master/Slave 화면 전환은 `assets/js/doro-playground.js`에서 처리합니다. OS의 동작 줄이기 설정에서는 정지 이미지로 시작하며, JavaScript 없이도 기본 미리보기와 실제 다운로드를 제공합니다.

맵 GIF는 비공개 EngineSimulatorWeb의 `Record Doro website preview` Actions workflow가 실제 Windows `DoroPanel`을 실행해 녹화한 자료입니다. 입력한 예시 응답 속도가 느림 → 빠름 → 느림으로 바뀌며 장치 연결이나 쓰기를 수행하지 않습니다. artifact의 `doro-{grass,space,ocean}.{gif,png}`를 `assets/programs/doro-modbus/`에 복사합니다. 원본 녹화 도구는 `BWACS/tools/Doro_Modbus/capture_preview.py`입니다.

### 새 프로그램 조회·다운로드 자동 저장

`_data/catalog.yml`에 `id`, `title`, `url`을 등록하고 기존 `product` 레이아웃의 소개 페이지를 추가하면 두키 알리미용 수집 대상에 자동으로 포함됩니다. 소개 페이지의 front matter `product`를 같은 `id`로 지정합니다. `id`를 생략한 평면 URL은 첫 경로에서 ID를 유도합니다. 별도의 `knownPrograms` 목록은 없습니다.

카탈로그 API를 읽는 Cloudflare Worker가 프로그램을 확인하고 조회·실제 GitHub Release 파일 링크 클릭을 공통 D1 테이블에 저장합니다. 알리미 앱 코드를 수정하거나 프로그램마다 서버를 재배포할 필요가 없습니다. 카탈로그는 서버에서 최대 60초 캐시합니다. 프로그램 이름을 바꿔도 기존 집계를 이어가려면 `id`와 소개 경로를 유지하세요.

### 웹 통계 표시

카탈로그 카드에는 누적 다운로드를, 모든 `product` 레이아웃의 큰 앱 이름 줄 오른쪽 끝에는 방문자 수·누적 다운로드를 작게 표시합니다. 좁은 화면에서는 오른쪽 정렬을 유지하며 자연스럽게 줄을 바꿉니다. 공통 레이아웃의 통계 템플릿과 `assets/js/program-stats.js`가 프로그램 ID에 맞게 자동 연결하므로 새 프로그램별 표시 코드를 작성하지 않습니다. 공통 스타일은 `assets/css/program-stats.css`입니다.

숫자는 Cloudflare `/v1/public/stats`에서 페이지당 한 번에 받아 표시합니다. 사이트 조회·다운로드 기록이 저장되면 필요한 경우 다시 읽고, 좋아요만 눌렀을 때는 다운로드를 갱신하지 않습니다. 서버 누적 집계는 알리미 앱 API와 같습니다. 실패하거나 값이 유효하지 않으면 숫자를 0으로 만들지 않고 `—`를 유지합니다. 개인정보가 포함된 앱용 인증 API는 브라우저에서 호출하지 않습니다.

모든 HTML 페이지의 사업자 표기는 공통 `_includes/business-footer.html`에서 관리하며, 언어와 관계없이 `Duki Lab`으로 표시합니다. 화면과 메타 정보에는 기존 브랜드명을 사용하지 않고, 기존 주소·저장소·배포 링크는 유지합니다.

개인정보처리방침은 `/privacy/`와 `/privacy/en/`에서 제공합니다. 내용은 `_data/privacy.yml`, 기존 공개 문의 이메일은 `_data/legal.yml`에서 관리합니다. 현행 서버 저장 항목, 통계 서비스 운영기간의 보관 기준, 삭제·권리 요청, Cloudflare·GitHub·Google 및 외부 후원 서비스, 광고 쿠키·브라우저 저장소를 설명합니다. 처리방침 페이지에는 방문 집계와 광고 스크립트를 넣지 않습니다. 보관기간·외부 서비스·문의처가 바뀌면 방침도 함께 갱신합니다.

## BitBox · 비트박스 (개발 중)

- 한국어: https://duki-programming.github.io/bitbox/
- English: https://duki-programming.github.io/bitbox/en/

`_includes/bitbox-page.html`, `_data/bitbox_copy.yml`, `assets/css/bitbox.css`에서 소개를 관리합니다. 카탈로그·공통 제품 레이아웃·통계·개인정보처리방침 링크를 공유합니다. 아이폰·워치 이미지는 실제 앱을 **가짜 계좌 데이터**로 실행한 개발 미리보기이며 실제 계좌나 투자 수익 실적이 아닙니다.

현재는 소개만 공개합니다. 다운로드는 링크 없는 `disabled` 버튼이며 App Store·TestFlight·IPA·GitHub Release 파일 링크나 릴리스 자동 갱신 스크립트를 넣지 않습니다. 소스는 비공개 `Duki-Programming/BitBox`에 보관하고 공개 릴리스는 만들지 않습니다. 공개 배포 전 별도 검증 후 다운로드 정책을 변경하세요. 이 상태는 `tests/bitbox-preview.test.mjs`로 확인합니다.

### 사이트 글꼴

전체 페이지의 한글은 Galmuri9, 영문은 피나타의 PF 스타더스트 3.0을 사용합니다. 스타더스트의 `unicode-range`를 라틴 문자 범위로 제한하여 혼합 문장에서도 한글은 갈무리로 표시합니다. 공통 설정은 `_includes/site-fonts.html`과 `assets/css/site-fonts.css`에 있으며, 본문·제목·버튼에 같은 글꼴을 적용합니다. Regular, Bold, ExtraBold 웹폰트는 [눈누가 제공하는 고정 버전 CDN](https://noonnu.cc/font_page/1614)에서 불러옵니다. 스타더스트 파일은 이 저장소에서 재배포하지 않습니다. 갈무리는 기존 로컬 파일과 OFL 라이선스를 사용합니다. [원 제작자 배포 및 이용 조건](https://m.blog.naver.com/campanula913/221366697603)을 참고하세요.
