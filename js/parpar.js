
function addParPar(appendId){
    let showParPar = document.getElementById(appendId);
    let dialog = document.createElement('dialog');
    showParPar.append(dialog);
    let table = document.createElement('table');
    dialog.append(table);
    let tbody  = document.createElement('tbody'); 
    table.append(tbody);

    let tr1 = document.createElement('tr');
    tbody.append(tr1);
    let td1 = document.createElement('td');
    tr1.append(td1);

    let input1 = document.createElement('input');
    input1.name = 'userName';
    input1.type = 'text';
    td1.append(input1);

    let tr2 = document.createElement('tr');
    tbody.append(tr2);
    let td2 = document.createElement('td');
    tr2.append(td2);
    let input2 = document.createElement('input');
    input2.name = 'passWord';
    input2.type = 'text';
    td2.append(input2);
    
    let tr3 = document.createElement('tr');
    tbody.append(tr3);
    let td3 = document.createElement('td');
    tr3.append(td3);

    let input3 = document.createElement('input');
    input3.name = 'loginSubmitBtn';
    input3.type = 'button';
    input3.value = '登入'
    td3.append(input3);

    let closeImg	= document.createElement('img');
    closeImg.src = './images/close.png';
    closeImg.id = 'closeImg';
    td1.append(closeImg);

    closeImg.addEventListener("click", function () {
        dialog.close();
        let showParParClose = document.getElementById('showParPar');
        while (showParParClose.firstChild) {
            showParParClose.removeChild(showParParClose.lastChild);
         }
    });
    dialog.style.border = "none";
    dialog.style.boxShadow = "none";
    dialog.style.border = "none";
    dialog.style.border = "none";
    dialog.showModal();
}