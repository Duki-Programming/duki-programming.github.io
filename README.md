# DukiProgramming

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

`_data/likes.yml`의 API는 Cloudflare Workers와 D1으로 운영하고, IP 원문 대신 서버 비밀키로 만든 HMAC을 고유 키로 사용합니다. 사이트의 다운로드 링크 클릭을 집계하며 파일 다운로드 완료·설치 여부나 GitHub의 전체 다운로드 횟수는 아닙니다. 같은 공인 IP는 각 OS의 한 표를 공유합니다. 서버 소스·마이그레이션·배포 방법은 `services/likes/README.md`에 있습니다. 설치 파일은 계속 GitHub Releases에서만 배포합니다.

### 개인 홈페이지와 프로그램 목록 공유

`/api/programs.json`은 `_data/catalog.yml`의 한국어 프로그램 목록에서 빌드할 때 자동 생성됩니다. 개인 홈페이지는 방문 시 이 목록을 불러와 자체 프로그램과 함께 표시합니다. 제목·설명·아이콘·링크·순서를 수정하고 이 사이트를 배포하면 개인 홈페이지를 다시 배포하지 않아도 다음 방문/새로고침에 반영됩니다. 개인 홈페이지 전용 프로그램은 유지됩니다.

## 두키 알리미 통계

`_config.yml`의 `notifier_api_url`에 Cloudflare Worker 주소를 설정하면 공통 카탈로그·제품 레이아웃에서 `notifier-analytics.js`를 실행합니다. 탭 세션에서 경로별 조회수를 1회 기록하고, 앱 소개 페이지의 실제 GitHub Release 파일 다운로드 클릭을 별도로 기록합니다. 쿼리 문자열이나 방문자 식별자는 보내지 않습니다. 비활성 버튼·섹션 이동·릴리스 노트는 다운로드에서 제외하며 같은 링크의 2초 내 더블클릭을 줄입니다. 브라우저 차단이나 오프라인에서는 누락될 수 있습니다.

기존 Market Peek 응원·다운로드 API는 그대로 유지합니다. 두키 알리미 앱은 기존 `platform_totals`의 IP·OS별 중복 제외 다운로드 합계를 읽으며 새 원시 클릭 수와 더하지 않습니다. 새 조회수는 이번 배포 이후부터 기록합니다. 조회 API는 전용 토큰이 필요하며 토큰은 공개 사이트 코드에 넣지 않습니다.

통계 API·아이폰·워치 원본은 별도 `DukiChoi/duki-notifier` 저장소에 있습니다. 검증: `node --test tests/*.test.mjs`, 기존 `services/likes` 테스트, Jekyll 빌드.

두키 알리미 다운로드 내역은 수집 시각과 Cloudflare가 제공한 원문 IP를 저장합니다. 조회수 이벤트에는 IP를 저장하지 않습니다. 기존 응원 API의 HMAC 집계와는 별도이며 최근 50건의 원문 IP는 조회 전용 토큰이 있는 통계 API에서만 반환합니다. 과거에 저장하지 않은 IP는 복원하지 않습니다.
