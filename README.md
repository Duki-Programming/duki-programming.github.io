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
