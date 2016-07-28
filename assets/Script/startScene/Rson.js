var Rson = {
    encode: function(obj){
        obj.data = JSON.stringify(obj.data);
        return JSON.stringify(obj);
    },

    decode: function(str){
        var a = JSON.parse(str);
        a.data = JSON.parse(a.data);
        return a;
    }
};

module.exports = Rson;