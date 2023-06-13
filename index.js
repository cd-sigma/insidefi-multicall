const MAKER_MULTICALL_ADDRESS = "0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441"
const MAKER_MULTICALL_ABI = require("./abi/maker.multicall.abi.json")
const OUTPUT_SIZE = 64

function encodeFunctionInputs(inputs, arguments, web3) {
    try {
        let encodedInputs = ""
        inputs.forEach((input, index) => {
            encodedInputs += web3.eth.abi.encodeParameter(input.type, arguments[index]).slice(2)
        })
        return encodedInputs
    } catch (error) {
        throw error
    }
}

async function multiCall(calls, web3, blockNumber = "latest") {
    return new Promise(async (resolve, reject) => {
        try {
            const multiCallContract = new web3.eth.Contract(MAKER_MULTICALL_ABI, MAKER_MULTICALL_ADDRESS)
            blockNumber !== "latest" && (multiCallContract.defaultBlock = blockNumber)

            let encodedCalls = []
            calls.forEach((call) => {
                encodedCalls.push({
                    target: call._parent._address,
                    callData:
                        call._method.signature +
                        encodeFunctionInputs(call._method.inputs, call.arguments, web3),
                })
            })
            let results = await multiCallContract.methods.aggregate(encodedCalls).call()

            let decodedResults = {},
                decodedResult = {},
                result = null,
                offset = 0
            calls.forEach((call, index) => {
                decodedResult = {}
                result = results.returnData[index]
                if (call._method.outputs.length > 1) {
                    offset = 0
                    call._method.outputs.forEach((output) => {
                        let decodedOutput = web3.eth.abi.decodeParameter(output.type, result.slice(offset))
                        decodedResult[output.name] = decodedOutput
                        offset += OUTPUT_SIZE
                    })
                } else {
                    decodedResult = web3.eth.abi.decodeParameter(call._method.outputs[0].type, result)
                }
                decodedResults[call._method.name] = decodedResult
            })
            resolve(decodedResults)
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    multiCall: multiCall,
}
