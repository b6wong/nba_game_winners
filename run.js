'use strict';

const request = require('request');

const myGames = [
    `0041800211`,
    `0041800212`,
    `0041800213`,
    `0041800214`,
    `0041800215`,
    `0041800216`
];

checkGames(myGames);

function checkGames(games)
{
    if (games.length === 0)
    {
        console.log('DONE');
        return;
    }
    console.log('--------------------------------------------------------------------')
    getGameDetail(games[0], function()
    {
        games.shift();
        checkGames(games);
    })
}

function getGameDetail(game_id, callback)
{
    const gameDetail_url = `https://data.nba.com/data/10s/v2015/json/mobile_teams/nba/2018/scores/gamedetail/${game_id}_gamedetail.json`;
    request(gameDetail_url, function (error, response, body)
    {
        if (error || response.statusCode !== 200)
        {
            console.log(`Error: ${error}`)
            return callback(error);
        }

        const data = JSON.parse(body);
        if (data && data['g'] && data['g']['vls'] && data['g']['hls'] && data['g']['lpla'])
        {
            const visitorData = data['g']['vls'];
            const homeData = data['g']['hls'];
            const lastPlay = data['g']['lpla'];

            const winningTeam = lastPlay.vs > lastPlay.hs ? 'VISITOR' : 'HOME';
            const gameWinningPoint = Math.min(lastPlay.vs, lastPlay.hs) + 1;

            console.log(`${visitorData.tc} ${visitorData.tn} ${lastPlay.vs} @ ${lastPlay.hs} ${homeData.tc} ${homeData.tn}`)
            findGameWinner(game_id, winningTeam, gameWinningPoint, callback);
        }
    });
}

function findGameWinner(game_id, winningTeam, gameWinningPoint, callback)
{
    const playByPlay_url = `https://data.nba.com/data/10s/v2015/json/mobile_teams/nba/2018/scores/pbp/${game_id}_full_pbp.json`;

    request(playByPlay_url, function (error, response, body)
    {
        if (error || response.statusCode !== 200)
        {
            console.log(`Error: ${error}`)
            return callback(error);
        }

        const data = JSON.parse(body);
        if (data && data['g'] && data['g']['pd'])
        {
            const periods = data['g']['pd'];
            for (const period of periods)
            {
                if (period['pla'])
                {
                    const events = period['pla'];
                    for (const event of events)
                    {
                        if ((winningTeam === 'HOME' && event.hs >= gameWinningPoint) ||
                            (winningTeam === 'VISITOR' && event.vs >= gameWinningPoint))
                        {
                            console.log(`GAME WINNER - Q${period.p} ${event.cl} - ${event.de}`);
                            return callback();
                        }
                    }
                }
            }
        }
    })
}
