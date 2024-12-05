# ruby 2.7 / node 16 이 설치되어야 합니다.
# node 의 설치가 더 편하므로, ruby image를 가져와서 node를 설치합니다.
FROM ruby:2.7-alpine as base
RUN apk -U add --no-cache \
    build-base \
    git \
    nodejs=16.20.2-r0 \
    npm

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# Increase Node.js heap size
# ENV NODE_OPTIONS="--max_old_space_size=4096"

# install dependencies - ruby
ADD Gemfile Gemfile.lock ./
# 2.7 버전의 루비를 사용하기 위해 bundler 2.4.22 버전으로 설치
RUN gem install bundler -v 2.4.22 \
    && bundler config --global frozen 1
RUN gem install eventmachine
RUN bundle install

# set working directory
WORKDIR /app

# start app
EXPOSE 4020

# install dependencies - node
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# add app
COPY . ./

RUN ls -al

# Github Action에서 submodule을 checkout 과정에서 사용하고 있음
# # add sproutcore app
# RUN git submodule update --init

FROM base as dev
# bundle app
RUN npm run build:bundle-dev

ENTRYPOINT npm run start

FROM base as prd
# bundle app
RUN npm run build:bundle-prd

ENTRYPOINT npm run start
