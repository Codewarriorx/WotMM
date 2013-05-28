var tankTypes = ['light', 'medium', 'heavy', 'tank destroyer', 'artilary'];
var population = [];

$(document).ready(function() {
	$('#playerTable').dataTable();
	$('#tankTable').dataTable();
	$('#matchSummary').dataTable();
	$('#platoons').dataTable();

	$('input[name="generate"]').click(function(event){
		event.preventDefault();
		tankNum = $('input[name="tankNum"]').val();
		playerNum = $('input[name="playerNum"]').val();

		generateTanks(tankNum);
		generatePlayers(playerNum);
		generatePlatoons(playerNum);
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

	for (var i = 0; i < players.length; i++) { // loop through all players in queue
		var player = getPlayer();

		if(unMadeMatches.length == 0 || checkUnMadeMatches(unMadeMatches, player) == -1){ // check if there are any un-made matches or if the player doesn't qualify for existing un-made matches
			// create the match around the player stats and tank
			var match = {
				id: matchCounter,
				upperTier: (player.tank.tier + 1),
				lowerTier: (player.tank.tier - 1),
				upperEff: (player.eff + 300),
				lowerEff: (player.eff - 300),
				players: [],
				timeCreated: Date.now(),
				timeFilled: 0
			}
			match.players.push(player); // add player to the match
			matchCounter++;
			unMadeMatches.push(match); // add match to the un-made stack
		}
		else{ // player qualifies for a match
			var matchIndex = checkUnMadeMatches(unMadeMatches, player); // get the index
			unMadeMatches[matchIndex].players.push(player); // push player into the match
			if(unMadeMatches[matchIndex].players.length == 15){ // is the match full?
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

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.players.length]);
	});

	unMadeMatches.forEach(function(element, index, array){
		var source = $('#matchTable').html();
		var template = Handlebars.compile(source);

		$('#matchContainer').append(template(element));

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.players.length]);
	});

	$('.matchTable').dataTable();
	$('#matchSummary').dataTable().fnClearTable();
	$('#matchSummary').dataTable().fnAddData(data);
}

function checkUnMadeMatches(unMadeMatches, player){
	for (var i = 0; i < unMadeMatches.length; i++) {
		if(qualifyForMatch(unMadeMatches[i], player)){
			return i;
		}
	}
	return -1;
}

function qualifyForMatch(unMadeMatch, player){
	if(unMadeMatch.upperTier >= player.tank.tier && player.tank.tier >= unMadeMatch.lowerTier){ // is the players tank inside the spread for the match?
		if(unMadeMatch.upperEff >= player.eff && player.eff >= unMadeMatch.lowerEff){
			// player qaulifies for this match
			return true
		}
	}
	return false;
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

function generateTanks(numOfTanks){
	tanks = [];
	var data = [];

	for (var i = 0; i < numOfTanks; i++) {
		var obj = {
			name: i,
			tier: Math.floor((Math.random()*10)+1),
			type: tankTypes[Math.floor(Math.random()*tankTypes.length)],
			battleTier: null,
			nation: null
		};

		tanks.push(obj);
		data.push([obj.name, obj.tier, obj.type]);
	}
	
	$('#tankTable').dataTable().fnClearTable();
	$('#tankTable').dataTable().fnAddData(data);
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
			}
			else{ // platoon isnt new, calc eff and tier
				obj.eff = Math.floor((obj.eff + player.eff)/2); // avg platoon eff
				if(obj.tier < player.tank.tier){
					obj.tier = player.tank.tier; // if this players tier is higher than the platoon one set it to that
				}
			}

			obj.players.push(player);
		}

		platoons.push(obj);
		data.push([obj.id, obj.tier, obj.eff, obj.numOfPlayers]);
	}
	
	var playersLeft = players.length;
	
	for (var i = 0; i < playersLeft; i++) { // gotta do 1 person platoons here
		var player = getPlayer();
		var obj = {
			id: platoons.length,
			eff: player.eff,
			tier: player.tank.tier,
			players: [player],
			numOfPlayers: 1
		};

		platoons.push(obj);
		data.push([obj.id, obj.tier, obj.eff, obj.numOfPlayers]);
	}

	$('#platoons').dataTable().fnClearTable();
	$('#platoons').dataTable().fnAddData(data);
}

function checkTotalPlayers(){
	var totalPlayers = 0;
	for (var i = 0; i < platoons.length; i++) {
		totalPlayers += platoons[i].players.length;
	}
	console.log(totalPlayers);
}