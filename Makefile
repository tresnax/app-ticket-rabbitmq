build:
	docker build ./producer -t ticket-app:latest

install:
	docker-compose up -d 

ps:
	docker-compose ps 

rm:
	docker-compose down

full: build rm install