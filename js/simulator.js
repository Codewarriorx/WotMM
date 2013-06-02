var matchQueue = [];
var players = [];
var platoonCounter = 0;
var tankTypes = {'Tank Destroyers': 0, 'Heavy Tank': 0, 'Medium Tank': 0, 'Light Tank': 0, 'SPGs': 0}

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

function simulator(){
	var loop = setInterval(function(){
		var numOfPlatoons = Math.floor(Math.random()*5);

		for (var p = 0; p < numOfPlatoons; p++) {
			var platoon = generatePlatoon();
			matchQueue[platoon.id] = platoon;
			platoonCounter++;
		}
		
		var stats = {
			numOfPlatoons: matchQueue.length,
			numOfPlayers: countPlayersInQueue(),
			tanksByTier: countTanksByTier(),
			tanksByType: countTanksByType(),
			avgEff: calcAvgEff()
		};

		var source = $('#statListing').html();
		var template = Handlebars.compile(source);

		$('#stats').html(template(stats));
	}, 1000);
}

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
		numOfArty: 0
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

	for (var i = 0; i < matchQueue.length; i++) {
		count += matchQueue[i].numOfPlayers;
	}

	return count;
}

function countTanksByTier(){
	var tanksByTier = [];

	for (var i = 0; i < matchQueue.length; i++) {
		for(var x = 0; x < matchQueue[i].tanksByTier.length; x++){
			if(typeof matchQueue[i].tanksByTier[x] !== "undefined"){
				if(typeof tanksByTier[x] === "undefined"){
					tanksByTier[x] = matchQueue[i].tanksByTier[x];
				}
				else{
					tanksByTier[x] += matchQueue[i].tanksByTier[x];
				}
			}
		}
	}

	return tanksByTier;
}

function countTanksByType(){
	var tanksByType = $.extend(true,{},tankTypes);

	for (var i = 0; i < matchQueue.length; i++) {
		for(key in matchQueue[i].tanksByType){
			tanksByType[key] += matchQueue[i].tanksByType[key];
		}
	}

	return tanksByType;
}

function calcAvgEff(){
	var totalEff = 0;

	for (var i = 0; i < matchQueue.length; i++) {
		totalEff += matchQueue[i].eff;
	}

	return Math.floor(totalEff / matchQueue.length);
}