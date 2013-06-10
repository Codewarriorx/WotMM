var matchQueue = [];
var unMadeMatches = [];
var madeMatches = [];
var matchCounter = 0;
var players = [];
var platoonCounter = 0;
var tankTypes = {'Tank Destroyers': 0, 'Heavy Tank': 0, 'Medium Tank': 0, 'Light Tank': 0, 'SPGs': 0};
var simulatorStart = 0;
var simulatorEnd = 0;
var platoons = [];

$(document).ready(function() {
	generateTanks();

	$('a[name="simulator"]').click(function(event){
		event.preventDefault();
		if(players > 0){
			alert('Please generate some tanks and players first');
		}
		else{
			/*if(matchQueue.length > 0){
				// clear any existing match listing tables
				$('.matchTable').dataTable().fnDestroy();
			}*/
			
			simulator();
		}
	});

	$('input[name="prepare"]').click(function(event){
		event.preventDefault();
		playerNum = $('input[name="playerNum"]').val();
		if(playerNum == ""){
			playerNum = 20000;
			$('input[name="playerNum"]').val(1000);
		}

		if(playerNum != "" && !isNaN(playerNum)){
			generatePlayers(playerNum);
		}
		else{
			alert('Please enter a number');
		}
	});
});

function generatePlayers(numOfPlayers){
	var data = [];

	for (var i = 0; i < numOfPlayers; i++) {
		var obj = {
			id: i,
			name: 'player_'+i,
			eff: Math.floor((Math.random()*1600)+300),
			tank: null,
			battlePoints: 0
		};

		players.push(obj);
		data.push([obj.id, obj.name, obj.eff]);
	}

	population = players.slice();

	$('#playerTable').dataTable().fnClearTable();
	$('#playerTable').dataTable().fnAddData(data);
}

Handlebars.registerHelper('byTier', function(tanksByTier, options){
	var output = '';

	for (var i = tanksByTier.length-1; i > 0; i--) {
		var count = 0;
		if(typeof tanksByTier[i] !== "undefined"){
			count = tanksByTier[i];
		}

		output += options.fn({ tier: i, count: count});
	}

	return output;
});

Handlebars.registerHelper('byType', function(tanksByType, options){
	var output = '';

	for(key in tanksByType){
		var count = tanksByType[key];
		var type = key;
		output += options.fn({ type: type, count: count});
	};

	return output;
});

Handlebars.registerHelper('timeLapsed', function(match){
	return ((match.timeFilled - match.timeCreated) / 60000).toFixed(2);
});

Handlebars.registerHelper('matchLength', function(match){
	return (match.matchEnd - match.timeFilled) / 60000;
});

Handlebars.registerHelper('timeFormat', function(time){
	var date = new Date(time);

	return date.getHours() + ':' + date.getMinutes();
});

function simulator(){
	simulatorStart = Date.now();

	var loop = setInterval(function(){
		if(players.length > 50){
			var numOfPlatoons = Math.floor(Math.random()*8);

			for (var p = 0; p < numOfPlatoons; p++) {
				var platoon = generatePlatoon();
				matchQueue.push(platoon);
				platoonCounter++;
			}

			var stats = {
				numOfPlatoons: matchQueue.length,
				numOfPlayers: countPlayersInQueue(),
				tanksByTier: countTanksByTier(),
				tanksByType: countTanksByType(),
				avgEff: calcAvgEff(),
				popNotInQueue: players.length,
				madeMatches: madeMatches.length,
				unMadeMatches: unMadeMatches.length,
				avgMatchTime: calcAvgMatchTime(),
				totalPlatoons: platoons.length
			};

			var source = $('#statListing').html();
			var template = Handlebars.compile(source);

			$('#stats').html(template(stats));
			matchMaker();
		}
		else{
			simulatorEnd = Date.now();
		}
	}, 1000);
}

function matchMaker(){
	console.log('match making');
	// $('#matchContainer').html('');

	matchQueue.forEach(function(element, index){ // loop through all platoons in queue
		var platoon = element;

		if(platoon.inQueue){
			platoon.inQueue = false;
			if(unMadeMatches.length == 0 || checkUnMadeMatches(unMadeMatches, platoon) == -1){ // check if there are any un-made matches or if the platoon doesn't qualify for existing un-made matches
				// create the match around the platoon stats and tank
				var match = {
					id: matchCounter,
					tier: platoon.tier,
					upperTier: (platoon.tier),
					lowerTier: (platoon.tier - 2),
					upperEff: (platoon.eff + 200),
					lowerEff: (platoon.eff - 200),
					battlePoints: platoon.battlePoints,
					platoons: [],
					playersPerTeam: [0, 0],
					artyPerTeam: [0, 0],
					numOfPlayers: 0,
					timeCreated: Date.now(),
					teams: null,
					timeFilled: 0,
					matchEnd: 0,
					ended: false,
					inQueueTimer: null
				};

				match.inQueueTimer = setTimeout(function(match){
					unMadeMatches.splice(unMadeMatches.indexOf(match), 1); // remove the match from the unmade queue
					// reset platoons inqueue status
					match.platoons.forEach(function(platoon){
						platoon.inQueue = true;
					});

					console.log('Reseting match');
				}, 50000, match);


				if(platoon.numOfArty > 0){
					match.artyPerTeam[0] = platoon.numOfArty;
				}

				match.playersPerTeam[0] = platoon.numOfPlayers;
				match.platoons.push(platoon); // add platoon to the match
				match.numOfPlayers += platoon.numOfPlayers;
				matchCounter++;
				unMadeMatches.push(match); // add match to the un-made stack
			}
			else{ // platoon qualifies for a match
				var matchIndex = checkUnMadeMatches(unMadeMatches, platoon); // get the index
				unMadeMatches[matchIndex].platoons.push(platoon); // push platoon into the match
				unMadeMatches[matchIndex].numOfPlayers += platoon.numOfPlayers;
				unMadeMatches[matchIndex].battlePoints += platoon.battlePoints;
				
				if(platoon.numOfArty > 0 && (unMadeMatches[matchIndex].artyPerTeam[0] + platoon.numOfArty) <= 3){
					unMadeMatches[matchIndex].artyPerTeam[0] += platoon.numOfArty;
				}
				else if(platoon.numOfArty > 0 && (unMadeMatches[matchIndex].artyPerTeam[1] + platoon.numOfArty) <= 3){
					unMadeMatches[matchIndex].artyPerTeam[1] += platoon.numOfArty;
				}

				if((unMadeMatches[matchIndex].playersPerTeam[0] + platoon.numOfPlayers) <= 15){
					unMadeMatches[matchIndex].playersPerTeam[0] += platoon.numOfPlayers;
				}
				else{
					unMadeMatches[matchIndex].playersPerTeam[1] += platoon.numOfPlayers;
				}

				if(unMadeMatches[matchIndex].numOfPlayers == 30){ // is the match full?
					// put timestamp in match for when it was finished
					unMadeMatches[matchIndex].timeFilled = Date.now();

					unMadeMatches[matchIndex].matchEnd = Date.now() + ((Math.floor(Math.random()*13)+2)*60000);
					unMadeMatches[matchIndex].timer = setTimeout(function(match){
						console.log('Ending match; players before: '+players.length);
						match.ended = true;
						match.platoons.forEach(function(platoon){
							platoon.players.forEach(function(player){
								players.push(player);
							});
						});
						console.log('Ending match; players after: '+players.length);
					}, (unMadeMatches[matchIndex].matchEnd - unMadeMatches[matchIndex].timeFilled), unMadeMatches[matchIndex]);

					// balance teams
					balanceTeam(unMadeMatches[matchIndex]);

					// move match to the made matches stack
					madeMatches.push(unMadeMatches[matchIndex]);

					// add match to table --new
					$('#matchSummary').dataTable().fnAddData([unMadeMatches[matchIndex].id, unMadeMatches[matchIndex].lowerTier+' - '+unMadeMatches[matchIndex].upperTier, unMadeMatches[matchIndex].lowerEff+' - '+unMadeMatches[matchIndex].upperEff, Math.floor((unMadeMatches[matchIndex].timeFilled-unMadeMatches[matchIndex].timeCreated)/1000), ((unMadeMatches[matchIndex].matchEnd - unMadeMatches[matchIndex].timeFilled)/60000), unMadeMatches[matchIndex].platoons.length, unMadeMatches[matchIndex].battlePoints, unMadeMatches[matchIndex].numOfPlayers]);
					var source = $('#matchTable').html();
					var template = Handlebars.compile(source);
					$('#madeContainer').append(template(unMadeMatches[matchIndex]));
					$('.accordion-group').last().find('.matchTable').dataTable();

					// remove platoons from queue --new
					removeFromQueue(unMadeMatches[matchIndex].platoons);

					// remove match from un-made matches
					unMadeMatches.splice(matchIndex, 1);
					console.log('match complete');
				}
			}
		}
	});

	/*var stats = {
		UnMadeMatches: unMadeMatches.length,
		madeMatches: madeMatches.length,
		total: matchCounter
	};

	var source = $('#statListing').html();
	var template = Handlebars.compile(source);

	$('#stats').html(template(stats));
	balanceTeams();
	displayMatches();*/
}

// function displayMatches(){
// 	var data = [];

// 	// Clear containers
// 	$('#madeContainer').html('');
// 	$('#unMadeContainer').html('');

// 	madeMatches.forEach(function(element, index, array){
// 		/*var source = $('#matchTable').html();
// 		var template = Handlebars.compile(source);

// 		$('#madeContainer').append(template(element));*/

// 		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, ((element.matchEnd - element.timeFilled)/60000), element.platoons.length, element.battlePoints, element.numOfPlayers]);
// 	});

// /*	unMadeMatches.forEach(function(element, index, array){
// 		var source = $('#matchTable').html();
// 		var template = Handlebars.compile(source);

// 		$('#unMadeContainer').append(template(element));

// 		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.platoons.length, element.battlePoints, element.numOfPlayers]);
// 	});*/

// 	// $('.matchTable').dataTable();
// 	$('#matchSummary').dataTable().fnClearTable();
// 	$('#matchSummary').dataTable().fnAddData(data);
// }

function balanceTeam(match){
	// sort platoons according to battle points
	match.platoons.sort(function(ele1, ele2){
		return ele2.battlePoints - ele1.battlePoints;
	});

	match.teams = [{
		id: 1,
		platoons: [],
		battlePoints: 0,
		numOfPlayers: 0
	},
	{
		id: 2,
		platoons: [],
		battlePoints: 0,
		numOfPlayers: 0
	}];

	for (var i = 0; i < match.platoons.length; i++) {
		if(match.teams[0].battlePoints <= match.teams[1].battlePoints && (match.teams[0].numOfPlayers + match.platoons[i].numOfPlayers) <= 15){ // put platoon into team 1
			match.teams[0].platoons.push(match.platoons[i]);
			match.teams[0].battlePoints += match.platoons[i].battlePoints;
			match.teams[0].numOfPlayers += match.platoons[i].numOfPlayers;
		}
		else if( (match.teams[1].numOfPlayers + match.platoons[i].numOfPlayers) <= 15 ){ // put platoon into team 2 if not full
			match.teams[1].platoons.push(match.platoons[i]);
			match.teams[1].battlePoints += match.platoons[i].battlePoints;
			match.teams[1].numOfPlayers += match.platoons[i].numOfPlayers;
		}
		else{ // put platoon into team 1, this is because team 2 is full
			match.teams[0].platoons.push(match.platoons[i]);
			match.teams[0].battlePoints += match.platoons[i].battlePoints;
			match.teams[0].numOfPlayers += match.platoons[i].numOfPlayers;
		}
	}
}

function removeFromQueue(platoonsList){
	console.log('removing platoons from queue');

	platoonsList.forEach(function(element, index){
		var i = matchQueue.indexOf(element);
		matchQueue.splice(i, 1);
	});
}

/*function getPlatoon(){
	var found = false;
	do{
		var id = Math.floor(Math.random()*matchQueue.length);
		var platoon = matchQueue[id];

		if(platoon.inQueue){
			found = true;
		}
	}while(!found)
	
	matchQueue[id].inQueue = false;
	// matchQueue.splice(id, 1);
	return platoon;
}*/

function generatePlatoon(){
	var platoon = {
		id: platoonCounter,
		eff: null,
		tier: Math.floor(Math.random()*10)+1,
		upperBattleTier: null,
		lowerBattleTier: null,
		battlePoints: 0,
		players: [],
		numOfPlayers: Math.floor(Math.random()*3)+1,
		tanksByTier: [],
		tanksByType: $.extend(true,{},tankTypes),
		numOfArty: 0,
		inQueue: true
	};

	for (var i = 0; i < platoon.numOfPlayers; i++) {
		var player = getPlayer();
		player.tank = getTankByTier(platoon.tier);
		player.battlePoints = Math.floor(player.eff / 100) + player.tank.tier;

		if(platoon.eff == null || platoon.tier == null){ // is this new?
			platoon.eff = player.eff;
			platoon.tier = player.tank.tier;
			platoon.upperBattleTier = player.tank.upperBattleTier;
			platoon.lowerBattleTier = player.tank.lowerBattleTier;
		}
		else{ // platoon isnt new, calc eff and tier
			platoon.eff = Math.floor((platoon.eff + player.eff)/2); // avg platoon eff

			if(platoon.upperBattleTier < player.tank.upperBattleTier){ // if this players tank has a higher battle tier than the platoon one set it to that
				platoon.tier = player.tank.tier;
				platoon.upperBattleTier = player.tank.upperBattleTier;
				platoon.lowerBattleTier = player.tank.lowerBattleTier;
			}
		}

		// calc battlePoints for player and tank
		platoon.battlePoints += player.battlePoints;

		if(player.tank.type == "SPGs"){
			platoon.numOfArty++;
		}

		if(typeof platoon.tanksByTier[player.tank.tier] === "undefined"){
			platoon.tanksByTier[player.tank.tier] = 1;
		}
		else{
			platoon.tanksByTier[player.tank.tier]++;
		}

		platoon.tanksByType[player.tank.type]++;
		platoon.players.push(player);
	}

	$('#platoons').dataTable().fnAddData([platoon.id, platoon.tier, platoon.eff, platoon.battlePoints, platoon.numOfPlayers]);
	platoons.push(platoon);
	return platoon;
}

function getTank(){
	return tanks[Math.floor(Math.random()*tanks.length)];
}

function getTankByTier(tier){
	var found = false;
	do{
		var tank = getTank();

		if(tank.tier > (tier - 1) && tank.tier < (tier + 1)){
			found = true;
		}
	}while(!found)
	
	return tank;
}

function countPlayersInQueue(){
	var count = 0;

	matchQueue.forEach(function(element, index){
		count += element.numOfPlayers;
	});

	return count;
}

function countTanksByTier(){
	var tanksByTier = [];

	matchQueue.forEach(function(element, index){
		for(var x = 0; x < element.tanksByTier.length; x++){
			if(typeof element.tanksByTier[x] !== "undefined"){
				if(typeof tanksByTier[x] === "undefined"){
					tanksByTier[x] = element.tanksByTier[x];
				}
				else{
					tanksByTier[x] += element.tanksByTier[x];
				}
			}
		}
	});

	return tanksByTier;
}

function countTanksByType(){
	var tanksByType = $.extend(true,{},tankTypes);

	matchQueue.forEach(function(element, index){
		for(key in element.tanksByType){
			tanksByType[key] += element.tanksByType[key];
		}
	});

	return tanksByType;
}

function calcAvgEff(){
	var totalEff = 0;

	matchQueue.forEach(function(element, index){
		totalEff += element.eff;
	});

	return Math.floor(totalEff / matchQueue.length);
}

function calcAvgMatchTime(){
	var totalSeconds = 0;

	madeMatches.forEach(function(match, index){
		totalSeconds += Math.floor((match.timeFilled-match.timeCreated)/1000);
	});

	return Math.floor(totalSeconds / madeMatches.length);
}