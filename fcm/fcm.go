
package main

import (
	"io/ioutil"
	"redis"
	"fmt"
	"os"
	"http"
)

var client redis.Client

func Redis() *redis.Client {
	return &client
}

func GetPage(url string) ([]byte, os.Error) {
	var e os.Error
	resp, e := http.Get(url)
	if e != nil { return nil, e }
	return ioutil.ReadAll(resp.Body)
}



func main() {
	client.Addr = "127.0.0.1:6379"
	if e := Redis().Set("_test", []byte("test")); e != nil {
		fmt.Println("error connecting: ",  e); return
	}
	
	val, e := Redis().Get("_test")
	if e != nil { fmt.Println(e); return }
	if string(val) != "test" { fmt.Println("Error testing redis"); return }

}
