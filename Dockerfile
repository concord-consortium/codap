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
    rsync \
    file \
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

# extn 레포 clone
WORKDIR /
RUN git clone https://github.com/concord-consortium/codap-data.git
RUN git clone https://github.com/team-monolith-product/codap-data-interactives.git

# codap-data-interactives 레포 라이브러리 설치
WORKDIR /codap-data-interactives
RUN npm ci

# set working directory
WORKDIR /codap

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

# makeCodap 실행을 위한 설정
RUN TZ='Asia/Seoul' date +'%Y%m%d%H%M%S' > buildnumber.txt
RUN touch ~/.codap-build.rc
RUN mkdir -p ../codap-data-interactives/target/build

# Github Action에서 submodule을 checkout 과정에서 사용하고 있음
# # add sproutcore app
# RUN git submodule update --init

FROM builder as builder-dev
# bundle app
RUN npm run build:bundle-dev

# timestamp 로 buildnumber 를 설정
RUN ./bin/makeCodap --languages=en,ko $(cat buildnumber.txt)

FROM builder as builder-prd
# bundle app
RUN npm run build:bundle-prd

# timestamp 로 buildnumber 를 설정
RUN ./bin/makeCodap --languages=en,ko $(cat buildnumber.txt)

### Step 2 ###
# Nginx 이미지로 전환하여 정적 파일 서빙

# bitnami/nginx 17.1.0 버전에서 사용하는 image tag
FROM bitnami/nginx:1.26.0-debian-12-r1 as dev

# 빌드된 정적 파일 복사
COPY --from=builder-dev /codap/dist /app/codap
COPY --from=builder-dev /codap/buildnumber.txt /app/buildnumber.txt

EXPOSE 80

# bitnami/nginx 17.1.0 버전에서 사용하는 image tag
FROM bitnami/nginx:1.26.0-debian-12-r1 as prd

# 빌드된 정적 파일 복사
COPY --from=builder-prd /codap/dist /app/codap
COPY --from=builder-prd /codap/buildnumber.txt /app/buildnumber.txt

# Nginx 포트 노출
EXPOSE 80
