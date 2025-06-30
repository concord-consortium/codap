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

# extn 레포 clone 및 빌드

# 1. codap-data
WORKDIR /
RUN git clone https://github.com/concord-consortium/codap-data.git
WORKDIR /codap-data
# 커밋 해쉬가 변경되면 캐시가 파기됩니다.
# https://api.github.com/repos/concord-consortium/codap-data/commits/master
RUN git checkout 7151186335a3e9e394c1b3fbd89d1a9a191e28e1

# 2. codap-data-interactives
WORKDIR /
RUN git clone https://github.com/team-monolith-product/codap-data-interactives.git
WORKDIR /codap-data-interactives
# 커밋 해쉬가 변경되면 캐시가 파기됩니다.
# https://api.github.com/repos/team-monolith-product/codap-data-interactives/commits/master
RUN git checkout 917dca171fb0c57278e1a6cf67d66bd8bcf9d384
# codap-data-interactives 레포 라이브러리 설치
RUN npm ci

# set working directory
WORKDIR /codap

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

# BUILD_NUMBER 를 env 로 설정
# 추후에 해당 숫자를 갖는 폴더는 경로에서 제거되므로, 임의의 숫자로 설정합니다.
ENV BUILD_NUMBER 000000

# makeCodap 명령이 local 환경에서 실행되는 것을 가정하고 있기 때문에,
# 비슷한 환경을 만들어줍니다.
RUN touch ~/.codap-build.rc
RUN mkdir -p ../codap-data-interactives/target/build



FROM builder as builder-dev
# bundle app
RUN npm run build:bundle-dev

# timestamp 로 buildnumber 를 설정
RUN ./bin/makeCodap --languages=en,ko $BUILD_NUMBER

# move up one level
RUN mv /codap/dist/$BUILD_NUMBER/* /codap/dist/



FROM builder as builder-prd
# bundle app
RUN npm run build:bundle-prod

# timestamp 로 buildnumber 를 설정
RUN ./bin/makeCodap --languages=en,ko $BUILD_NUMBER

# move up one level
RUN mv /codap/dist/$BUILD_NUMBER/* /codap/dist/



### Step 2 ###
# Nginx 이미지로 전환하여 정적 파일 서빙

# bitnami/nginx 20.1.3 버전에서 사용하는 image tag
FROM bitnami/nginx:1.28.0-debian-12-r3 as dev

# 빌드된 정적 파일 복사
COPY --from=builder-dev /codap/dist /app/codap

EXPOSE 80



# bitnami/nginx 20.1.3 버전에서 사용하는 image tag
FROM bitnami/nginx:1.28.0-debian-12-r3 as prd

# 빌드된 정적 파일 복사
COPY --from=builder-prd /codap/dist /app/codap

# Nginx 포트 노출
EXPOSE 80
