# Fetching the minified node image on apline linux
FROM node:slim

# Declaring env
ENV NODE_ENV production
ENV API_URL http://10.17.56.85

# Setting up the work directory
WORKDIR /pdf-converter

# Copying all the files in our project
COPY . .

RUN apt-get update
RUN apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Installing dependencies
RUN npm install

# Exposing server port
EXPOSE 3021

CMD ["npm", "start"]