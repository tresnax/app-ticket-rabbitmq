FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install express amqplib body-parser

COPY . .

CMD ["node", "app.js"]

EXPOSE 3000