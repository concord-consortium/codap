### Step 1 ###
# Ruby와 Node.js 설치 및 정적 파일 빌드

# ruby 2.7 / node 16 이 설치되어야 합니다.
# node 의 설치가 더 편하므로, ruby image를 가져와서 node를 설치합니다.
# nginx 이미지가 debian을 사용하고 있기에 통일합니다.
FROM bitnami/ruby:2.7-debian-11 as builder

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    zlib1g-dev \
    git \
    curl \
    openjdk-11-jdk \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Node.js 16.20 설치
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs=16.20.2-1nodesource1 \
    && apt-mark hold nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

    # add `/app/node_modules/.bin` to $PATH
    ENV PATH /app/node_modules/.bin:$PATH
    
    # set working directory
    WORKDIR /app
    
    # Increase Node.js heap size
    # ENV NODE_OPTIONS="--max_old_space_size=4096"
    
    # install dependencies - ruby
    ADD Gemfile Gemfile.lock ./
    # 2.7 버전의 루비를 사용하기 위해 bundler 2.4.22 버전으로 설치
    RUN gem install bundler -v 2.4.22 \
        && bundler config --global frozen 1
    RUN gem install eventmachine
    RUN bundle install

# Node.js 의존성 설치
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# add app
COPY . ./

# Github Action에서 submodule을 checkout 과정에서 사용하고 있음
# # add sproutcore app
# RUN git submodule update --init

FROM builder as builder-dev
# bundle app
RUN npm run build:bundle-dev
RUN npm run build:local

FROM builder as builder-prd
# bundle app
RUN npm run build:bundle-prd
RUN npm run build:local

### Step 2 ###
# Nginx 이미지로 전환하여 정적 파일 서빙

# bitnami/nginx 17.1.0 버전에서 사용하는 image tag
FROM bitnami/nginx:1.26.0-debian-12-r1 as dev

# 빌드된 정적 파일 복사
COPY --from=builder-dev /app/tmp/build /app/codap
# 빌드된 정적 파일의 버전 정보를 추출하는 스크립트 복사
COPY --from=builder-dev --chmod=+x /app/extract-build-hash.sh /app/extract-build-hash.sh

# Nginx 포트 노출
EXPOSE 80

# bitnami/nginx 17.1.0 버전에서 사용하는 image tag
FROM bitnami/nginx:1.26.0-debian-12-r1 as prd

# 빌드된 정적 파일 복사
COPY --from=builder-prd /app/tmp/build /app/codap
# 빌드된 정적 파일의 버전 정보를 추출하는 스크립트 복사
COPY --from=builder-dev --chmod=+x /app/extract-build-hash.sh /app/extract-build-hash.sh

# Nginx 포트 노출
EXPOSE 80
