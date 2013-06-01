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
		if(playerNum == ""){
			playerNum = 1000;
			$('input[name="playerNum"]').val(1000);
		}

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
			if((typeof matchCounter !== "undefined")){
				// clear any existing match listing tables
				$('.matchTable').dataTable().fnDestroy();
			}
			
			matchMaker();
		}
	});

	$('.subMenu a').click(function(event){
		event.preventDefault();
		$('.subMenu > li').removeClass('active');
		$(this).parent().addClass('active');
		$('.section').addClass('hiddenSection');
		var sectionID = $(this).attr('href');
		$(sectionID).removeClass('hiddenSection');
	});
});

Handlebars.registerHelper('list', function(platoons, options){
	var output = '';

	for (var p = 0; p < platoons.length; p++) {
		var pid = platoons[p].id;
		for (var i = 0; i < platoons[p].players.length; i++) {
			platoons[p].players[i].pid = pid;
			output += options.fn(platoons[p].players[i]);
		}
	}

	return output;
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
				timeFilled: 0
			}

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
	balanceTeams();
	displayMatches();
}

function balanceTeams(){
	for (var m = 0; m < madeMatches.length; m++) {
		// sort platoons according to battle points
		madeMatches[m].platoons.sort(function(ele1, ele2){
			return ele2.battlePoints - ele1.battlePoints;
		});

		madeMatches[m].teams = [{
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

		for (var i = 0; i < madeMatches[m].platoons.length; i++) {
			if(madeMatches[m].teams[0].battlePoints <= madeMatches[m].teams[1].battlePoints && (madeMatches[m].teams[0].numOfPlayers + madeMatches[m].platoons[i].numOfPlayers) <= 15){ // put platoon into team 1
				madeMatches[m].teams[0].platoons.push(madeMatches[m].platoons[i]);
				madeMatches[m].teams[0].battlePoints += madeMatches[m].platoons[i].battlePoints;
				madeMatches[m].teams[0].numOfPlayers += madeMatches[m].platoons[i].numOfPlayers;
			}
			else if( (madeMatches[m].teams[1].numOfPlayers + madeMatches[m].platoons[i].numOfPlayers) <= 15 ){ // put platoon into team 2 if not full
				madeMatches[m].teams[1].platoons.push(madeMatches[m].platoons[i]);
				madeMatches[m].teams[1].battlePoints += madeMatches[m].platoons[i].battlePoints;
				madeMatches[m].teams[1].numOfPlayers += madeMatches[m].platoons[i].numOfPlayers;
			}
			else{ // put platoon into team 1, this is because team 2 is full
				madeMatches[m].teams[0].platoons.push(madeMatches[m].platoons[i]);
				madeMatches[m].teams[0].battlePoints += madeMatches[m].platoons[i].battlePoints;
				madeMatches[m].teams[0].numOfPlayers += madeMatches[m].platoons[i].numOfPlayers;
			}
		}
	}
}

function displayMatches(){
	var data = [];

	// Clear containers
	$('#madeContainer').html('');
	$('#unMadeContainer').html('');

	madeMatches.forEach(function(element, index, array){
		var source = $('#matchTable').html();
		var template = Handlebars.compile(source);

		$('#madeContainer').append(template(element));

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.platoons.length, element.battlePoints, element.numOfPlayers]);
	});

	unMadeMatches.forEach(function(element, index, array){
		var source = $('#matchTable').html();
		var template = Handlebars.compile(source);

		$('#unMadeContainer').append(template(element));

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.platoons.length, element.battlePoints, element.numOfPlayers]);
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
	// if((unMadeMatch.upperTier >= platoon.upperBattleTier && platoon.upperBattleTier >= unMadeMatch.lowerTier) || (unMadeMatch.upperTier >= platoon.lowerBattleTier && platoon.lowerBattleTier >= unMadeMatch.lowerTier)){ // is the platoons tier inside the spread for the match?
	if((platoon.upperBattleTier >= unMadeMatch.tier && unMadeMatch.tier >= platoon.lowerBattleTier)){ // is the platoons tier inside the spread for the match?
		if(unMadeMatch.upperEff >= platoon.eff && platoon.eff >= unMadeMatch.lowerEff){
			// platoon qaulifies for this match, does it fit?
			if( (unMadeMatch.numOfPlayers + platoon.numOfPlayers) <= 30 && ( (unMadeMatch.playersPerTeam[0] + platoon.numOfPlayers) <= 15 || (unMadeMatch.playersPerTeam[1] + platoon.numOfPlayers) <= 15) ){
				// does the platoon have arty? if so does it fit?
				if(platoon.numOfArty == 0){
					return true; // no arty
				}
				else if((unMadeMatch.artyPerTeam[0] + platoon.numOfArty) <= 3){ // there is arty does it fit the first group
					return true;
				}
				else if((unMadeMatch.artyPerTeam[1] + platoon.numOfArty) <= 3){ // does it fit the second group?
					return true;
				}
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
			tank: tanks[Math.floor(Math.random()*tanks.length)],
			battlePoints: 0
		};

		obj.battlePoints = Math.floor(obj.eff / 100) + obj.tank.tier;

		players.push(obj);
		data.push([obj.name, obj.eff, obj.tank.name, obj.battlePoints]);
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
			numOfPlayers: 0,
			numOfArty: 0
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

				if(obj.upperBattleTier < player.tank.upperBattleTier){ // if this players tank has a higher battle tier than the platoon one set it to that
					obj.tier = player.tank.tier;
					obj.upperBattleTier = player.tank.upperBattleTier;
					obj.lowerBattleTier = player.tank.lowerBattleTier;
				}
			}
			// calc battlePoints for player and tank
			obj.battlePoints += player.battlePoints;
			if(player.tank.type == "SPGs"){
				obj.numOfArty++;
			}
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
			numOfPlayers: 1,
			numOfArty: 0
		};
		if(player.tank.type == "SPGs"){
			obj.numOfArty++;
		}
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