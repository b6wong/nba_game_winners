'use strict';

const moment = require('moment');
const request = require('request');

const START_DATE = "20190404";
const END_DATE = "20190406";

checkNBAGamesInDateRange(START_DATE, END_DATE);

function checkNBAGamesInDateRange(startDate, endDate)
{
    if (startDate === endDate)
    {
        return;
    }
    const date = moment(startDate, "YYYYMMDD");
    gamesForDay(date.format("YYYYMMDD"), function()
    {
        date.add(1, 'days');
        checkNBAGamesInDateRange(date.format("YYYYMMDD"), endDate);
    })
}

function gamesForDay(day, callback)
{
    const date = moment(day, "YYYYMMDD");
    console.log('');
    console.log(`===== ${date.format("MMM Do YYYY")} ==============================`);
    const dayBoxScore_url = `https://stats.nba.com/js/data/widgets/boxscore_breakdown_${day}.json`;
    const options = {
        url: dayBoxScore_url,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36'
        }
    };

    request(options, function (error, response, body)
    {
        if (error || response.statusCode !== 200)
        {
            console.log(`Error: ${error}`)
            return callback(error);
        }

        const data = JSON.parse(body);
        if (data && data['results'])
        {
            const gameIDs = data['results'].map(game => game.GameID);
            checkGames(gameIDs, function()
            {
                return callback();
            });
        }
        else
        {
            return callback();
        }
    })
}


function checkGames(games, callback)
{
    if (games.length === 0)
    {
        return callback();
    }
    console.log('');
    findGameWinner(games[0], function()
    {
        games.shift();
        checkGames(games, function()
        {
            return callback();
        });
    })
}

function findGameWinner(game_id, callback)
{
    const playByPlay_url = `https://stats.nba.com/stats/playbyplayv2?EndPeriod=10&GameID=${game_id}&StartPeriod=1`;
    const options = {
        url: playByPlay_url,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36'
        }
    };

    request(options, function (error, response, body)
    {
        if (error || response.statusCode !== 200)
        {
            console.log(`Error: ${error}`)
            return callback(error);
        }

        const data = JSON.parse(body);
        if (data && data['resultSets'] && data['resultSets'][0] && data['resultSets'][0]['headers'] && data['resultSets'][0]['rowSet'])
        {
            const headers = data['resultSets'][0]['headers'];
            const plays = data['resultSets'][0]['rowSet'];
            
            const headerIndexMap = {};
            for (const index in headers)
            {
                headerIndexMap[headers[index]] = index;
            }

            let firstPlay = null;
            for (const play of plays)
            {
                //play[headerIndexMap['EVENTMSGTYPE']]
                if (play[headerIndexMap['EVENTMSGTYPE']] === 10)
                {
                    firstPlay = play;
                    break;
                }
            }

            //const firstPlay = plays[1];
            const homeTeamCity = firstPlay[headerIndexMap['PLAYER1_TEAM_CITY']];
            const homeTeamName = firstPlay[headerIndexMap['PLAYER1_TEAM_NICKNAME']];
            const visitorTeamCity = firstPlay[headerIndexMap['PLAYER2_TEAM_CITY']];
            const visitorTeamName = firstPlay[headerIndexMap['PLAYER2_TEAM_NICKNAME']];
            
            const lastPlay = plays[plays.length-1];
            const finalScore = lastPlay[headerIndexMap['SCORE']];
            const finalVisitorScore = parseInt(finalScore.split("-")[0], 10);
            const finalHomeScore = parseInt(finalScore.split("-")[1], 10);
            const winningTeam = finalHomeScore > finalVisitorScore ? "HOME" : "VISITOR";
            const gameWinningPoint = Math.min(finalHomeScore, finalVisitorScore) + 1;

            console.log(`${visitorTeamCity} ${visitorTeamName} (${finalVisitorScore}) @ (${finalHomeScore}) ${homeTeamCity} ${homeTeamName} [${game_id}]`);

            for (const play of plays)
            {
                if (play[headerIndexMap['EVENTMSGTYPE']] === 1 || play[headerIndexMap['SCORE']] !== null)
                {
                    const playDescription = play[headerIndexMap['HOMEDESCRIPTION']] || play[headerIndexMap['NEUTRALDESCRIPTION']] || play[headerIndexMap['VISITORDESCRIPTION']];
                    const playPeriod = play[headerIndexMap['PERIOD']];
                    const playClock = play[headerIndexMap['PCTIMESTRING']];
                    const playScore = play[headerIndexMap['SCORE']];
                    const visitorScore = parseInt(playScore.split("-")[0], 10);
                    const homeScore = parseInt(playScore.split("-")[1], 10);
                    const gameWinnerPlayerID = play[headerIndexMap['PLAYER1_ID']];
                    const gameWinnerName = play[headerIndexMap['PLAYER1_NAME']];

                    if ((winningTeam === 'HOME' && homeScore >= gameWinningPoint) ||
                        (winningTeam === 'VISITOR' && visitorScore >= gameWinningPoint))
                    {
                        console.log(`GAME WINNER - Q${playPeriod} ${playClock} - ${playDescription} - ${gameWinnerName} [${gameWinnerPlayerID}]`);
                        return callback();
                    }
                }    
            }
        }
        else
        {
            console.log(`Error: repsonse does not contain data.`);
            return callback(`Error: repsonse does not contain data.`);
        }
    })
}
