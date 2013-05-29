var tankTypes = ['light', 'medium', 'heavy', 'tank destroyer', 'artilary'];
var population = [];
var allPlatoons = [];

$(document).ready(function() {
	$('#playerTable').dataTable();
	$('#tankTable').dataTable();
	$('#matchSummary').dataTable();
	$('#platoons').dataTable();

	$('input[name="generate"]').click(function(event){
		event.preventDefault();
		playerNum = $('input[name="playerNum"]').val();
		if(playerNum != "" && !isNaN(playerNum)){
			generateTanks();
			generatePlayers(playerNum);
			generatePlatoons(playerNum);
		}
		else{
			alert('Please enter a number');
		}
	});

	$('a[name="matchmake"]').click(function(event){
		event.preventDefault();
		if(typeof tanks === 'undefined'){
			alert('Please generate some tanks and players first');
		}
		else{
			matchMaker();
		}
	});
});

function matchMaker(){
	players = population;
	console.log('match making');
	$('#matchContainer').html('');
	unMadeMatches = [];
	madeMatches = [];
	matchCounter = 0;

	for (var i = 0; i < platoons.length; i++) { // loop through all platoons in queue
		var platoon = getPlatoon();

		if(unMadeMatches.length == 0 || checkUnMadeMatches(unMadeMatches, platoon) == -1){ // check if there are any un-made matches or if the platoon doesn't qualify for existing un-made matches
			// create the match around the platoon stats and tank
			var match = {
				id: matchCounter,
				upperTier: (platoon.tier + 1),
				lowerTier: (platoon.tier - 1),
				upperEff: (platoon.eff + 300),
				lowerEff: (platoon.eff - 300),
				platoons: [],
				numOfPlayers: 0,
				timeCreated: Date.now(),
				timeFilled: 0
			}
			match.platoons.push(platoon); // add platoon to the match
			match.numOfPlayers += platoon.numOfPlayers;
			matchCounter++;
			unMadeMatches.push(match); // add match to the un-made stack
		}
		else{ // platoon qualifies for a match
			var matchIndex = checkUnMadeMatches(unMadeMatches, platoon); // get the index
			unMadeMatches[matchIndex].platoons.push(platoon); // push platoon into the match
			unMadeMatches[matchIndex].numOfPlayers += platoon.numOfPlayers;

			if(unMadeMatches[matchIndex].numOfPlayers == 15){ // is the match full?
				// put timestamp in match for when it was finished
				unMadeMatches[matchIndex].timeFilled = Date.now();
				// move match to the made matches stack
				madeMatches.push(unMadeMatches[matchIndex]);
				// remove match from un-made matches
				unMadeMatches.splice(matchIndex, 1);
			}
		}
	}

	var stats = {
		UnMadeMatches: unMadeMatches.length,
		madeMatches: madeMatches.length,
		total: matchCounter
	};

	var source = $('#statListing').html();
	var template = Handlebars.compile(source);

	$('#stats').html(template(stats));
	displayMatches();
}

function displayMatches(){
	var data = [];
	madeMatches.forEach(function(element, index, array){
		var source = $('#matchTable').html();
		var template = Handlebars.compile(source);

		$('#matchContainer').append(template(element));

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.platoons.length, element.numOfPlayers]);
	});

	unMadeMatches.forEach(function(element, index, array){
		var source = $('#matchTable').html();
		var template = Handlebars.compile(source);

		$('#matchContainer').append(template(element));

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.platoons.length, element.numOfPlayers]);
	});

	$('.matchTable').dataTable();
	$('#matchSummary').dataTable().fnClearTable();
	$('#matchSummary').dataTable().fnAddData(data);
}

function checkUnMadeMatches(unMadeMatches, platoon){
	for (var i = 0; i < unMadeMatches.length; i++) {
		if(qualifyForMatch(unMadeMatches[i], platoon)){
			return i;
		}
	}
	return -1;
}

function qualifyForMatch(unMadeMatch, platoon){
	if(unMadeMatch.upperTier >= platoon.tier && platoon.tier >= unMadeMatch.lowerTier){ // is the platoons tier inside the spread for the match?
		if(unMadeMatch.upperEff >= platoon.eff && platoon.eff >= unMadeMatch.lowerEff){
			// platoon qaulifies for this match, does it fit?
			if((unMadeMatch.numOfPlayers + platoon.numOfPlayers) <= 30){
				return true
			}
		}
	}
	return false;
}

function getPlatoonBySize(size){
	var found = false;
	do{
		var id = Math.floor(Math.random()*platoons.length);
		var platoon = platoons[id];

		if(platoon.numOfPlayers <= size){
			found = true;
		}
	}while(!found)

	platoons.splice(id, 1);
	return platoon;
}

function getPlatoon(){
	var id = Math.floor(Math.random()*platoons.length);
	var platoon = platoons[id];
	platoons.splice(id, 1);
	return platoon;
}

function getPlayer(){
	var id = Math.floor(Math.random()*players.length);
	var player = players[id];
	players.splice(id, 1);
	return player;
}

function getPlayerByTier(tier){
	var found = false;
	do{
		var id = Math.floor(Math.random()*players.length);
		var player = players[id];

		if(player.tank.tier > (tier - 1) && player.tank.tier < (tier + 1)){
			found = true;
		}
	}while(!found)
	
	players.splice(id, 1);
	return player;
}

function generateTanks(){
	tanks = [];
	var data = [];

	for (var i = 0; i < tankInfo.levelArraySimple.length; i++) {
		// get nation and type from the complete level array
		var tankObj = getFullTankInfo(tankInfo.levelArraySimple[i].id, tankInfo.levelArraySimple[i].levelLow);
		var nation = tankObj._country;
		var type = tankObj._name.substring(0, tankObj._name.indexOf("_"));

		var obj = {
			id: tankInfo.levelArraySimple[i].id,
			name: tankInfo.levelArraySimple[i].name,
			tier: tankInfo.levelArraySimple[i].levelLow,
			type: type,
			upperBattleTier: tankInfo.levelArraySimple[i].levelHigh,
			lowerBattleTier: tankInfo.levelArraySimple[i].levelLow,
			nation: nation
		};

		tanks.push(obj);
		data.push([obj.name, obj.tier, obj.lowerBattleTier+' - '+obj.upperBattleTier, obj.type]);
	}
	
	$('#tankTable').dataTable().fnClearTable();
	$('#tankTable').dataTable().fnAddData(data);
}

function getFullTankInfo(id, tier){ // send in lowest tier from simple level array
	var ele = null;
	tankInfo.levelArray[tier].forEach(function(element){
		if(element._id == id){
			ele = element;
		}
	});
	return ele;
}

function generatePlayers(numOfPlayers){
	players = [];
	var data = [];

	for (var i = 0; i < numOfPlayers; i++) {
		var obj = {
			name: i,
			eff: Math.floor((Math.random()*1600)+300),
			tank: tanks[Math.floor(Math.random()*tanks.length)]
		};

		players.push(obj);
		data.push([obj.name, obj.eff, obj.tank.name]);
	}
	population = players.slice();
	console.log(population);
	$('#playerTable').dataTable().fnClearTable();
	$('#playerTable').dataTable().fnAddData(data);
}

function generatePlatoons(numOfPlayers){
	platoons = [];
	var multiPersonPlatoons = Math.floor((numOfPlayers/3)*.75);
	var data = [];

	for (var i = 0; i < multiPersonPlatoons; i++) {
		var obj = {
			id: i,
			eff: null,
			tier: null,
			upperBattleTier: null,
			lowerBattleTier: null,
			battlePoints: 0,
			players: [],
			numOfPlayers: 0
		};

		var numPlayers = Math.floor(Math.random()*3)+1;
		obj.numOfPlayers = numPlayers;
		for (var x = 0; x < numPlayers; x++) {
			if(obj.tier == null){
				var player = getPlayer();
			}
			else{
				var player = getPlayerByTier(obj.tier);
			}

			if(obj.eff == null || obj.tier == null){ // is this new?
				obj.eff = player.eff;
				obj.tier = player.tank.tier;
				obj.upperBattleTier = player.tank.upperBattleTier;
				obj.lowerBattleTier = player.tank.lowerBattleTier;
			}
			else{ // platoon isnt new, calc eff and tier
				obj.eff = Math.floor((obj.eff + player.eff)/2); // avg platoon eff

				if(obj.tier < player.tank.tier){ // if this players tier is higher than the platoon one set it to that
					obj.tier = player.tank.tier;
					obj.upperBattleTier = player.tank.upperBattleTier;
					obj.lowerBattleTier = player.tank.lowerBattleTier;
				}
			}
			// calc battlePoints for player and tank
			obj.battlePoints += Math.floor(player.eff / 100) + player.tank.tier;
			obj.players.push(player);
		}

		platoons.push(obj);
		data.push([obj.id, obj.tier, obj.eff, obj.battlePoints, obj.numOfPlayers]);
	}
	
	var playersLeft = players.length;
	
	for (var i = 0; i < playersLeft; i++) { // gotta do 1 person platoons here
		var player = getPlayer();

		var obj = {
			id: platoons.length,
			eff: player.eff,
			tier: player.tank.tier,
			upperBattleTier: player.tank.upperBattleTier,
			lowerBattleTier: player.tank.lowerBattleTier,
			battlePoints: Math.floor(player.eff / 100) + player.tank.tier,
			players: [player],
			numOfPlayers: 1
		};

		platoons.push(obj);
		data.push([obj.id, obj.tier, obj.eff, obj.battlePoints, obj.numOfPlayers]);
	}

	$('#platoons').dataTable().fnClearTable();
	$('#platoons').dataTable().fnAddData(data);
	allPlatoons = platoons.slice();
}

function checkTotalPlayers(){
	var totalPlayers = 0;
	for (var i = 0; i < platoons.length; i++) {
		totalPlayers += platoons[i].players.length;
	}
	console.log(totalPlayers);
}