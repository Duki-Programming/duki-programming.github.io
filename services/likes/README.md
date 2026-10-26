# Market Peek 좋아요 집계

GitHub Pages는 기존 그대로 사용하고 이 Cloudflare Worker + D1 API만 별도로 배포합니다. `_data/likes.yml`의 `api_url`이 비어 있으면 공개 사이트에 미완성 카운터를 노출하지 않습니다.

## 동작

- `GET /v1/market-peek/stats`: IP별 중복을 제거한 전체 `count`, 현재 IP의 `liked`, 내부 OS별 집계.
- `POST /v1/market-peek/likes`: 다운로드 전에도 직접 응원할 수 있습니다.
- `POST /v1/market-peek/{windows|macos}/likes`: 다운로드 전에도 직접 응원할 수 있습니다.
- `POST /v1/market-peek/{windows|macos}/download`: 해당 OS의 다운로드와 응원을 함께 기록합니다.
- 화면에는 응원 합계 및 따봉 버튼 하나만 표시합니다. 다운로드 수와 OS별 집계는 내부에서만 관리합니다. 수동 따봉과 모든 OS의 다운로드를 합쳐 한 IP의 응원은 최대 1개입니다.
- 내부 다운로드 기록은 같은 IP에서 OS별로 1회만 반영됩니다. 따봉 이후 다운로드하거나 다운로드 이후 따봉을 눌러도 응원은 중복 증가하지 않습니다. Windows 설치 파일과 압축 파일은 같은 Windows 집계에 포함합니다.
- 두 언어와 모든 릴리스 버전에서 각 OS의 카운터를 공유합니다. 기존 `/likes`, `/download` 경로도 동일한 IP 중복 방지를 적용합니다. 마이그레이션은 기존 기록의 고유 IP를 보존하여 공개 합계를 다시 계산합니다.
- IP 원문은 저장하지 않습니다. 서버 전용 `IP_HASH_SECRET`으로 만든 HMAC만 저장합니다. `CF-Connecting-IP`만 신뢰하며 클라이언트가 보낸 IP 값이나 `X-Forwarded-For`는 사용하지 않습니다.
- D1 `supporters`의 고유 키 `ip_hash`와 트랜잭션으로 중복·동시 클릭을 방지합니다. 같은 공인 IP를 쓰는 사람들은 응원 한 번을 공유하며, VPN이나 IP 변경까지 사람 단위로 막는 기능은 아닙니다.
- GitHub의 파일 다운로드 완료 여부는 이 사이트가 확인할 수 없어 **사이트의 다운로드 링크 클릭**을 기준으로 활성화합니다. GitHub 다운로드 수나 설치 완료 수가 아니며, GitHub 직접 다운로드는 집계하지 않습니다.
- 집계 서버가 실패해도 다운로드 링크는 그대로 작동합니다. 캐시나 브라우저 저장소의 가짜 숫자를 표시하지 않습니다.

## 배포

이 폴더에서 실행합니다. Cloudflare 로그인과 계정 선택이 필요합니다.

```sh
npm ci
npx wrangler login
npx wrangler d1 create market-peek-likes
cp wrangler.production.example.jsonc wrangler.production.jsonc
```

생성된 실제 데이터베이스 ID를 `wrangler.production.jsonc`의 `database_id`에 넣습니다. 설정 예시의 자리표시자를 그대로 배포하지 않습니다.

```sh
npx wrangler d1 migrations apply DB --remote --config wrangler.production.jsonc
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | npx wrangler secret put IP_HASH_SECRET --config wrangler.production.jsonc
npm run deploy
```

`IP_HASH_SECRET`은 서버 비밀값으로만 보관하고 저장소나 웹사이트 코드에 넣지 않습니다. 이 값을 바꾸면 기존 IP의 중복 방지 키도 달라지므로 유지해야 합니다. 배포된 HTTPS Worker origin을 `_data/likes.yml`의 `api_url`에 넣고 사이트를 다시 빌드·푸시합니다. API 설정은 앱 릴리스가 자동 갱신하는 `_data/market_peek.yml`과 분리돼 있습니다.

## 검증

```sh
npm test
npx wrangler d1 migrations apply DB --local --config wrangler.local.jsonc
```

로컬 테스트 시 `.dev.vars`에 테스트 전용 32자 이상의 `IP_HASH_SECRET`을 넣고 `npm run dev`로 실행합니다. 허용 origin은 로컬에서 `http://127.0.0.1:4212`, 배포 시 `https://duki-programming.github.io`입니다. 로컬 DB는 운영 집계와 분리됩니다. 브라우저 테스트는 다운로드 전 수동 응원, 다운로드의 자동 응원, OS와 동작을 합친 IP 중복 방지, 한국어·영문 공유 및 모바일 배치를 확인합니다.

공식 문서: [Workers 설정](https://developers.cloudflare.com/workers/wrangler/configuration/), [D1 마이그레이션](https://developers.cloudflare.com/d1/reference/migrations/), [클라이언트 IP 헤더](https://developers.cloudflare.com/fundamentals/reference/http-headers/).
