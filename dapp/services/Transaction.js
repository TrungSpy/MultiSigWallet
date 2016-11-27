(
  function(){
    angular
    .module('multiSigWeb')
    .service('Transaction', function(Wallet, $rootScope){
      var factory = {
        transactions: JSON.parse(localStorage.getItem("transactions")) || {}
      };

      factory.add = function(tx){
        factory.transactions[tx.txHash] = tx;
        tx.date = new Date();
        localStorage.setItem("transactions", JSON.stringify(factory.transactions));
        try{
          $rootScope.$digest();
        }
        catch(e){

        }
      }

      factory.remove = function(txHash){
        delete factory.transactions[txHash];
        localStorage.setItem("transactions", JSON.stringify(factory.transactions));
        try{
          $rootScope.$digest();
        }
        catch(e){

        }
      }

      factory.removeAll = function(){
        factory.transactions = {};
        localStorage.removeItem("transactions");
        try{
          $rootScope.$digest();
        }
        catch(e){

        }
      }

      factory.send = function(tx, cb){
        Wallet.web3.eth.sendTransaction(tx, function(e, txHash){
          if(e){
            cb(e);
          }
          else{
            factory.add({txHash: txHash});
            cb(null, txHash);
          }
        });
      }

      factory.sendMethod = function(tx, abi, method, params, cb){
        // Instance contract
        var instance = Wallet.web3.eth.contract(abi).at(tx.to);
        var transactionParams = params.slice();
        // sendTransction takes (param1, param2, ..., paramN, txObject, cb)
        transactionParams.push(tx);
        transactionParams.push(function(e, txHash){
          if(e){
            cb(e);
          }
          else{
              // Add transaction
              cb(null, txHash);
          }
        });
        console.log(transactionParams)
        instance[method].sendTransaction.apply(this, transactionParams);

      }

      // Transaction loop, checking transaction receipts
      factory.checkReceipts = function(){
        // Create batch object
        var batch = Wallet.web3.createBatch();

        // Add transactions without receipt to batch request
        var txHashes = Object.keys(factory.transactions);

        for(var i=0; i<txHashes.length; i++){
          var tx = factory.transactions[txHashes[i]];
          if(tx && !tx.receipt){
            batch.add(
              Wallet.web3.eth.getTransactionReceipt.request(txHashes[i], function(e, receipt){
                if(!e && receipt){
                  factory.transactions[receipt.transactionHash].receipt = receipt;
                  // call callback if it has
                  if(factory.transactions[receipt.transactionHash].callback){
                    factory.transactions[receipt.transactionHash].callback();
                  };

                  // update transactions
                  localStorage.setItem("transactions", JSON.stringify(factory.transactions));
                  try{
                    $rootScope.$digest();
                  }
                  catch(e){

                  }
                }
              })
            );
          }
        }

        batch.execute();
        setTimeout(factory.checkReceipts, 15000);
      }

      factory.checkReceipts();

      return factory;
    });
  }
)();
