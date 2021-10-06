#!/usr/bin/env node
const chalk = require('chalk');
const log = require('gulog');
const inquirer = require('inquirer');
const exec = require('child_process').exec;
const path = require('path');
const homedir = require('os').homedir();
const fs = require('fs');

log.setup({
    prefix: chalk.bold('[shuteasy]'),
    info: {
        text_color: 'blue',
        show_prefix: false,
    },
});

const shuteasy_folder = path.join(homedir, '/.shuteasy');
const shuteasy_config = path.join(shuteasy_folder, 'config.json');

function check_folder() {
    if (!fs.existsSync(shuteasy_folder)) {
        fs.mkdirSync(shuteasy_folder);

        const cfg = {
            default_time: '17:00:20',
        };

        fs.writeFile(shuteasy_config, JSON.stringify(cfg), 'utf8', (err) => {
            if (err) {
                return console.error(err);
            }
        });
    }
}

function shutdown(shutdown_date, now) {
    let diff;
    let seconds;
    let tomorrow_advise = false;

    if (shutdown_date < now) {
        shutdown_date.setDate(shutdown_date.getDate() + 1);
        tomorrow_advise = true;
    }

    diff = shutdown_date.getTime() - now.getTime();
    seconds = Math.floor(Math.abs((diff + 1000) / 1000));

    exec(`shutdown -s -t ${seconds}`, (err, stdout, stderr) => {
        if (err) return console.error(err);
        if (stderr) return console.error(stderr);

        if (stdout.length == 0) {
            log.info('Agendamento criado com sucesso.');
            if (tomorrow_advise)
                log.warn(
                    `Como o horário informado já passou, o agendamento foi criado para o dia seguinte (${shutdown_date.getDate()})`
                );
        }
    });
}

function main() {
    const args = process.argv.slice(2);

    if (args.length <= 0) {
        const question_prefix = chalk`{magenta {bold [shuteasy]}} {green [?]}`;
        const questions = [
            {
                name: 'horario',
                type: 'input',
                prefix: question_prefix,
                message: chalk`{reset Qual é o horário em que deseja desligar o computador? Exemplo: 17:00}\n{magenta [shuteasy]} {gray »}`,
                validate: async (value) => {
                    const val = value.split(':');
                    const error_msg =
                        'Argumentos incorretos, certifique-se de que está no formato "HH:MM:SS" ou "HH:MM" ou "HH".';
                    if (val.length == 3) {
                        const hours = val[0];
                        const minutes = val[1];
                        const seconds = val[2];

                        if (
                            isNaN(parseInt(hours)) ||
                            isNaN(parseInt(minutes)) ||
                            isNaN(parseInt(seconds))
                        )
                            return error_msg;

                        if (parseInt(hours) > 23 || parseInt(hours) < 0)
                            return 'A horas precisam estar entre 00 e 23!';

                        if (parseInt(minutes) > 59 || parseInt(minutes) < 0)
                            return 'Os minutos precisam estar entre 00 e 59!';

                        if (parseInt(seconds) > 59 || parseInt(seconds) < 0)
                            return 'Os segundos precisam estar entre 00 e 59!';
                    } else if (val.length == 2) {
                        const hours = val[0];
                        const minutes = val[1];

                        if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) return error_msg;

                        if (parseInt(hours) > 23 || parseInt(hours) < 0)
                            return 'A horas precisam estar entre 00 e 23!';

                        if (parseInt(minutes) > 59 || parseInt(minutes) < 0)
                            return 'Os minutos precisam estar entre 00 e 59!';
                    } else if (val.length == 1) {
                        const hours = val[0];

                        if (isNaN(parseInt(hours))) return error_msg;

                        if (parseInt(hours) > 23 || parseInt(hours) < 0)
                            return 'A horas precisam estar entre 00 e 23!';
                    } else {
                        return error_msg;
                    }

                    return true;
                },
            },
        ];

        inquirer.prompt(questions).then((answers) => {
            const answer = answers.horario;

            const horario = answer.split(':');

            let horas = horario[0];
            let minutos;
            let segundos;

            let now = new Date();
            let shutdown_date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), horas);

            if (horario.length >= 2) {
                minutos = horario[1];
                shutdown_date.setMinutes(minutos);
            }

            if (horario.length === 3) {
                segundos = horario[2];
                shutdown_date.setSeconds(segundos);
            }

            if (shutdown_date !== null || shutdown_date !== undefined) {
                now = new Date();
                shutdown(shutdown_date, now);
            }
        });
    } else {
        const options = [
            {
                option: '-d',
                description: 'Shutdown to default time from config file.',
                usage: '-d',
            },
        ];

        for (x of options) {
            const { option, usage } = x;

            if (option === '-d') {
                if (args.length === 1) {
                    check_folder();

                    fs.readFile(shuteasy_config, 'utf8', (err, data) => {
                        if (err) return console.error(err);
                        let cfg = JSON.parse(data);

                        const answer = cfg.default_time;
                        const horario = answer.split(':');

                        let horas = horario[0];
                        let minutos;
                        let segundos;

                        let now = new Date();
                        let shutdown_date = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                            horas
                        );

                        if (horario.length >= 2) {
                            minutos = horario[1];
                            shutdown_date.setMinutes(minutos);
                        }

                        if (horario.length === 3) {
                            segundos = horario[2];
                            shutdown_date.setSeconds(segundos);
                        }

                        if (shutdown_date !== null || shutdown_date !== undefined) {
                            now = new Date();
                            shutdown(shutdown_date, now);
                        }
                    });
                } else {
                    log.error('Erro de sintaxe! Modo de uso:');
                    log.error(chalk`   » {white shuteasy} {gray ${usage}}`);
                    process.exit();
                }
            }
        }
    }
}

main();
